-- Two features from the Collectr comparison of 2026-10-16.
--
-- 1. Manual value: the price coverage is capped by the CardSight quota, so many owned cards
--    have no market price and counted as $0. The owner can now type an estimate. It is a
--    fallback only: as soon as a market price exists, the market price wins. A manual value
--    never moves (no 24h change) and never leaves the owner's account (shares stay market-only).
-- 2. Trade analyzer: compares two lists of cards at market value, and can be saved as a public
--    share (hoopticker.com/share/<code>, kind 'trade') so trades discussed elsewhere link back.

-- 1. Manual value ---------------------------------------------------------------------------

alter table public.collection_items
  add column manual_value_cents integer
  check (manual_value_cents is null or (manual_value_cents >= 0 and manual_value_cents <= 100000000));

comment on column public.collection_items.manual_value_cents is
  'Owner estimate in cents, used only while the card has no market price.';

-- Columns are appended so the view keeps its contract.
create or replace view public.collection_items_detailed
with (security_invoker = true) as
select
  ci.id,
  ci.user_id,
  ci.parallel_id,
  ci.grade,
  ci.serial_number,
  ci.purchase_cents,
  ci.photo_path,
  ci.created_at,
  par.name as parallel_name,
  par.serial_run,
  c.id as card_id,
  c.slug as card_slug,
  c.number as card_number,
  c.is_rookie,
  pl.id as player_id,
  pl.name as player_name,
  pl.slug as player_slug,
  pl.team,
  s.id as set_id,
  s.name as set_name,
  s.slug as set_slug,
  s.season,
  cp.price_cents as current_cents,
  cp.captured_at as price_captured_at,
  cp.buy_url,
  public.change_24h_cents(ci.parallel_id, ci.grade) as change_24h_cents,
  case
    when public.is_premium() and ci.purchase_cents is not null
      and coalesce(cp.price_cents, ci.manual_value_cents) is not null
    then (coalesce(cp.price_cents, ci.manual_value_cents) - ci.purchase_cents)::integer
  end as gain_cents,
  ci.manual_value_cents,
  coalesce(cp.price_cents, ci.manual_value_cents) as value_cents,
  case
    when cp.price_cents is not null then 'market'
    when ci.manual_value_cents is not null then 'manual'
  end as value_source
from public.collection_items ci
join public.parallels par on par.id = ci.parallel_id
join public.cards c on c.id = par.card_id
join public.players pl on pl.id = c.player_id
join public.card_sets s on s.id = c.set_id
left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade;

-- Same contract as before; the value of an item is the market price, else the manual value.
-- A manual-only item has no history, so its market change is 0 (prev = now).
create or replace function public.collection_summary()
returns table (
  item_count integer,
  total_cents bigint,
  change_24h_cents bigint,
  market_change_cents bigint,
  added_cents bigint,
  invested_cents bigint,
  gain_cents bigint,
  is_premium boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select
      ci.created_at,
      ci.purchase_cents,
      coalesce(cp.price_cents, ci.manual_value_cents) as now_cents,
      case when cp.price_cents is not null
        then public.price_at(ci.parallel_id, ci.grade, now() - interval '24 hours')
      end as prev_cents
    from public.collection_items ci
    left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade
    where ci.user_id = auth.uid()
  ),
  agg as (
    select
      count(*)::integer as item_count,
      coalesce(sum(now_cents), 0)::bigint as total_cents,
      coalesce(sum(case when created_at <= now() - interval '24 hours'
                        then now_cents - coalesce(prev_cents, now_cents) else 0 end), 0)::bigint as market_change_cents,
      coalesce(sum(case when created_at > now() - interval '24 hours' then now_cents else 0 end), 0)::bigint as added_cents,
      coalesce(sum(purchase_cents), 0)::bigint as invested_cents,
      coalesce(sum(case when purchase_cents is not null then now_cents - purchase_cents else 0 end), 0)::bigint as gain_cents
    from items
  )
  select
    item_count,
    total_cents,
    market_change_cents + added_cents,
    market_change_cents,
    added_cents,
    invested_cents,
    -- Gains/losses are a Premium feature.
    case when public.is_premium() then gain_cents else null end,
    public.is_premium()
  from agg;
$$;

-- Export: current value and gain follow the same rule; 24h and 30d changes stay market-only.
create or replace function public.collection_export()
returns table (
  season text, set_name text, card_number text, player_name text, parallel_name text,
  serial_run integer, serial_number integer, grade public.grade, is_rookie boolean, added_at timestamptz,
  purchase_cents integer, current_cents integer, change_24h_cents integer, change_30d_cents integer, gain_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.season, s.name, c.number, pl.name, par.name,
    par.serial_run, ci.serial_number, ci.grade, c.is_rookie, ci.created_at,
    ci.purchase_cents, coalesce(cp.price_cents, ci.manual_value_cents),
    cp.price_cents - public.price_at(ci.parallel_id, ci.grade, now() - interval '24 hours'),
    cp.price_cents - public.price_at(ci.parallel_id, ci.grade, now() - interval '30 days'),
    case when ci.purchase_cents is not null
      then coalesce(cp.price_cents, ci.manual_value_cents) - ci.purchase_cents end
  from public.collection_items ci
  join public.parallels par on par.id = ci.parallel_id
  join public.cards c on c.id = par.card_id
  join public.players pl on pl.id = c.player_id
  join public.card_sets s on s.id = c.set_id
  left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade
  where ci.user_id = auth.uid()
  order by ci.created_at;
$$;

-- Set or clear (null) the manual value of one of the caller's items.
create or replace function public.set_manual_value(p_item_id uuid, p_cents integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_cents is not null and (p_cents < 0 or p_cents > 100000000) then
    raise exception 'MANUAL_VALUE_INVALID';
  end if;
  update public.collection_items
  set manual_value_cents = p_cents
  where id = p_item_id and user_id = auth.uid();
  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;
end;
$$;
revoke execute on function public.set_manual_value(uuid, integer) from public, anon;
grant execute on function public.set_manual_value(uuid, integer) to authenticated;

-- 2. Trade analyzer --------------------------------------------------------------------------

-- p_items: [{"side": "give" | "get", "parallel_id": uuid, "grade": "RAW" | "PSA9" | "PSA10"}],
-- 1 to 10 cards per side. Market prices only: a trade compares what the market pays, not
-- either collector's estimate. Fair = the two totals within 10% of the larger one.
create or replace function public.trade_value(p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_give integer;
  v_get integer;
  v_result jsonb;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'TRADE_INVALID:items';
  end if;
  select count(*) filter (where e ->> 'side' = 'give'), count(*) filter (where e ->> 'side' = 'get')
  into v_give, v_get
  from jsonb_array_elements(p_items) e;
  if v_give < 1 or v_get < 1 or v_give > 10 or v_get > 10
     or v_give + v_get <> jsonb_array_length(p_items) then
    raise exception 'TRADE_INVALID:size';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where e ->> 'grade' not in ('RAW', 'PSA9', 'PSA10')
       or (e ->> 'parallel_id') !~ '^[0-9a-f-]{36}$'
  ) then
    raise exception 'TRADE_INVALID:item';
  end if;

  with items as (
    select
      e.ordinality as pos,
      e.value ->> 'side' as side,
      (e.value ->> 'parallel_id')::uuid as parallel_id,
      (e.value ->> 'grade')::public.grade as grade
    from jsonb_array_elements(p_items) with ordinality e
  ),
  priced as (
    select
      i.pos, i.side,
      jsonb_build_object(
        'parallel_id', pa.id, 'grade', i.grade,
        'player', pl.name, 'set', s.name, 'season', s.season, 'number', ca.number,
        'parallel', pa.name, 'serial_run', pa.serial_run, 'rookie', ca.is_rookie,
        'card_slug', ca.public_slug,
        'value_cents', cp.price_cents, 'price_kind', cp.price_kind, 'sale_at', cp.sale_at
      ) as item,
      cp.price_cents
    from items i
    join public.parallels pa on pa.id = i.parallel_id
    join public.cards ca on ca.id = pa.card_id
    join public.card_sets s on s.id = ca.set_id
    join public.players pl on pl.id = ca.player_id
    left join public.current_prices cp on cp.parallel_id = i.parallel_id and cp.grade = i.grade
  ),
  sides as (
    select
      side,
      jsonb_agg(item order by pos) as items,
      coalesce(sum(price_cents), 0)::bigint as total_cents,
      count(*) filter (where price_cents is null)::integer as unpriced
    from priced
    group by side
  )
  select jsonb_build_object(
    'give', jsonb_build_object('items', g.items, 'total_cents', g.total_cents, 'unpriced', g.unpriced),
    'get', jsonb_build_object('items', t.items, 'total_cents', t.total_cents, 'unpriced', t.unpriced),
    'diff_cents', t.total_cents - g.total_cents,
    'verdict', case
      when g.unpriced + t.unpriced > 0 and (g.total_cents = 0 or t.total_cents = 0) then 'unknown'
      when abs(t.total_cents - g.total_cents) <= 0.10 * greatest(g.total_cents, t.total_cents) then 'fair'
      when t.total_cents > g.total_cents then 'you_win'
      else 'you_lose'
    end
  )
  into v_result
  from sides g, sides t
  where g.side = 'give' and t.side = 'get';

  -- A side whose cards are all unknown parallels disappears from the join above.
  if v_result is null then
    raise exception 'TRADE_INVALID:item';
  end if;
  return v_result;
end;
$$;
revoke execute on function public.trade_value(jsonb) from public, anon;
grant execute on function public.trade_value(jsonb) to authenticated;

-- Trades become a share kind.
alter table public.shares drop constraint shares_kind_check;
alter table public.shares
  add constraint shares_kind_check check (kind in ('lineup', 'league', 'vault', 'trade'));

-- Saves a trade as a public share and returns its code. Same rate limit as create_share().
create or replace function public.create_trade_share(p_items jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_payload jsonb;
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if (select count(*) from public.shares where user_id = v_uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'RATE_LIMITED:share';
  end if;
  v_payload := public.trade_value(p_items);
  loop
    v_code := lower(public.new_invite_code()) || lower(substr(public.new_invite_code(), 1, 2));
    exit when not exists (select 1 from public.shares where code = v_code);
  end loop;
  insert into public.shares (code, user_id, kind, payload)
  values (v_code, v_uid, 'trade', v_payload || jsonb_build_object(
    'username', coalesce((select username from public.profiles where id = v_uid), 'A collector')));
  return v_code;
end;
$$;
revoke execute on function public.create_trade_share(jsonb) from public, anon;
grant execute on function public.create_trade_share(jsonb) to authenticated;
