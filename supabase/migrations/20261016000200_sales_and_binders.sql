-- Two more features from the Collectr comparison of 2026-10-16.
--
-- 3. Sales: selling a card moves it out of the Vault into `sales`, a snapshot of what it was
--    (parallel, grade, serial, purchase price, binder) and what it sold for. The Vault and every
--    computation built on it (value, limits, Last night, Vault Score) stay unchanged. Recording a
--    sale is free; the realized gain is Premium, like gains and losses. A sale can be undone.
-- 4. Binders: named groups of cards ("PC", "For sale", "At grading"). One binder on the free plan,
--    unlimited on Premium (`plan_limits.binders`, enforced by the usual trigger).

-- 4. Binders ----------------------------------------------------------------------------------

create table public.binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
create unique index binders_user_name_idx on public.binders (user_id, lower(btrim(name)));
alter table public.binders enable row level security;
create policy "own binders" on public.binders
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

insert into public.plan_limits (key, free_value, premium_value, description)
values ('binders', 1, null, 'Binders (named groups of cards in the Vault)')
on conflict (key) do nothing;

create trigger binders_limit
before insert on public.binders
for each row execute function public.enforce_plan_limit('binders');

alter table public.collection_items
  add column binder_id uuid references public.binders (id) on delete set null;
create index collection_items_binder_id_idx on public.collection_items (binder_id);

-- A card can only go in a binder of its owner.
create or replace function public.check_item_binder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.binder_id is not null and not exists (
    select 1 from public.binders b where b.id = new.binder_id and b.user_id = new.user_id
  ) then
    raise exception 'BINDER_FORBIDDEN';
  end if;
  return new;
end;
$$;

create trigger collection_items_binder_owner
before insert or update of binder_id on public.collection_items
for each row execute function public.check_item_binder();

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
  end as value_source,
  ci.binder_id,
  b.name as binder_name
from public.collection_items ci
join public.parallels par on par.id = ci.parallel_id
join public.cards c on c.id = par.card_id
join public.players pl on pl.id = c.player_id
join public.card_sets s on s.id = c.set_id
left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade
left join public.binders b on b.id = ci.binder_id;

-- Binders of the caller with their card count and value (same value rule as the Vault total).
create or replace function public.binder_summaries()
returns table (id uuid, name text, item_count integer, total_cents bigint, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id, b.name,
    count(ci.id)::integer,
    coalesce(sum(coalesce(cp.price_cents, ci.manual_value_cents)), 0)::bigint,
    b.created_at
  from public.binders b
  left join public.collection_items ci on ci.binder_id = b.id
  left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade
  where b.user_id = auth.uid()
  group by b.id
  order by b.created_at;
$$;
revoke execute on function public.binder_summaries() from public, anon;
grant execute on function public.binder_summaries() to authenticated;

-- 3. Sales ------------------------------------------------------------------------------------

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parallel_id uuid not null references public.parallels (id) on delete restrict,
  grade public.grade not null,
  serial_number integer,
  purchase_cents integer,
  sold_cents integer not null check (sold_cents between 0 and 100000000),
  fees_cents integer not null default 0 check (fees_cents between 0 and 100000000),
  sold_on date not null,
  acquired_at timestamptz not null,
  binder_id uuid references public.binders (id) on delete set null,
  created_at timestamptz not null default now()
);
create index sales_user_sold_idx on public.sales (user_id, sold_on desc);
alter table public.sales enable row level security;
-- Read and delete own rows; writes go through record_sale() / undo_sale().
create policy "own sales read" on public.sales for select to authenticated using (user_id = (select auth.uid()));
create policy "own sales delete" on public.sales for delete to authenticated using (user_id = (select auth.uid()));

create or replace view public.sales_detailed
with (security_invoker = true) as
select
  sa.id,
  sa.user_id,
  sa.parallel_id,
  sa.grade,
  sa.serial_number,
  sa.purchase_cents,
  sa.sold_cents,
  sa.fees_cents,
  sa.sold_on,
  sa.acquired_at,
  sa.created_at,
  par.name as parallel_name,
  par.serial_run,
  c.number as card_number,
  c.slug as card_slug,
  c.is_rookie,
  pl.name as player_name,
  s.name as set_name,
  s.season,
  -- Realized gain is a Premium feature, decided here and not in clients.
  case when public.is_premium() and sa.purchase_cents is not null
    then sa.sold_cents - sa.fees_cents - sa.purchase_cents end as profit_cents
from public.sales sa
join public.parallels par on par.id = sa.parallel_id
join public.cards c on c.id = par.card_id
join public.players pl on pl.id = c.player_id
join public.card_sets s on s.id = c.set_id;

create or replace function public.sales_summary()
returns table (sale_count integer, sold_cents bigint, fees_cents bigint, profit_cents bigint, is_premium boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::integer,
    coalesce(sum(sold_cents), 0)::bigint,
    coalesce(sum(fees_cents), 0)::bigint,
    case when public.is_premium() then
      coalesce(sum(sold_cents - fees_cents - purchase_cents) filter (where purchase_cents is not null), 0)::bigint
    end,
    public.is_premium()
  from public.sales
  where user_id = auth.uid();
$$;
revoke execute on function public.sales_summary() from public, anon;
grant execute on function public.sales_summary() to authenticated;

-- Moves one of the caller's cards to `sales`. Returns the sale id and the card photo path, which
-- the client removes from storage (SQL cannot delete storage objects).
create or replace function public.record_sale(
  p_item_id uuid,
  p_sold_cents integer,
  p_fees_cents integer default 0,
  p_sold_on date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.collection_items;
  v_sale_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_sold_cents is null or p_sold_cents < 0 or p_sold_cents > 100000000
     or coalesce(p_fees_cents, 0) < 0 or coalesce(p_fees_cents, 0) > 100000000 then
    raise exception 'SALE_INVALID:amount';
  end if;
  if p_sold_on is not null and (p_sold_on > public.eastern_day() or p_sold_on < date '2000-01-01') then
    raise exception 'SALE_INVALID:date';
  end if;

  select * into v_item from public.collection_items
  where id = p_item_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  insert into public.sales (user_id, parallel_id, grade, serial_number, purchase_cents, sold_cents,
    fees_cents, sold_on, acquired_at, binder_id)
  values (v_item.user_id, v_item.parallel_id, v_item.grade, v_item.serial_number, v_item.purchase_cents,
    p_sold_cents, coalesce(p_fees_cents, 0), coalesce(p_sold_on, public.eastern_day()),
    v_item.created_at, v_item.binder_id)
  returning id into v_sale_id;

  delete from public.collection_items where id = v_item.id;
  return jsonb_build_object('sale_id', v_sale_id, 'photo_path', v_item.photo_path);
end;
$$;
revoke execute on function public.record_sale(uuid, integer, integer, date) from public, anon;
grant execute on function public.record_sale(uuid, integer, integer, date) to authenticated;

-- Puts a sold card back in the Vault (the card limit applies) and forgets the sale.
-- The photo was removed at sale time and does not come back.
create or replace function public.undo_sale(p_sale_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
  v_item_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select * into v_sale from public.sales
  where id = p_sale_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'SALE_NOT_FOUND';
  end if;

  insert into public.collection_items (user_id, parallel_id, grade, serial_number, purchase_cents,
    created_at, binder_id)
  values (v_sale.user_id, v_sale.parallel_id, v_sale.grade, v_sale.serial_number, v_sale.purchase_cents,
    v_sale.acquired_at, v_sale.binder_id)
  returning id into v_item_id;

  delete from public.sales where id = v_sale.id;
  return v_item_id;
end;
$$;
revoke execute on function public.undo_sale(uuid) from public, anon;
grant execute on function public.undo_sale(uuid) to authenticated;
