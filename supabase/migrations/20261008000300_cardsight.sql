-- CardSight AI becomes the price source (decided 2026-10-08). eBay Browse stays in the code,
-- disabled. Prices now come from eBay sales and listings through CardSight, in three states:
--   auction_median  median of completed auction sales over the period, at least 3 sales
--   last_auction    the one or two auction sales of the period: the latest one, with its date
--   ask_median      median of current Buy It Now asking prices (the fallback, and the common case)
--
-- Data policy while CardSight answers in writing about history storage (cautious option):
--   * never store raw listings: price_listings exists but is written only when
--     app_settings.price_source.store_raw_listings is true;
--   * store only our own daily aggregates per card, parallel and grade (price_points,
--     current_prices, one row per actual change as before);
--   * cache raw API responses short-term only (cardsight_cache, hours, purged on every run).

-- ---------------------------------------------------------------------------
-- 1. Price state on every price
-- ---------------------------------------------------------------------------
alter table public.current_prices
  add column price_kind text not null default 'ask_median',
  add column sale_at timestamptz;
alter table public.current_prices
  add constraint current_prices_price_kind_check
  check (price_kind in ('auction_median', 'last_auction', 'ask_median'));

alter table public.price_points
  add column price_kind text not null default 'ask_median',
  add column sale_at timestamptz;
alter table public.price_points
  add constraint price_points_price_kind_check
  check (price_kind in ('auction_median', 'last_auction', 'ask_median'));

create or replace view public.latest_prices
with (security_invoker = true) as
select parallel_id, grade, source, price_cents, sample_size, buy_url, captured_at, checked_at,
  price_kind, sale_at
from public.current_prices;

-- record_price() learns the state. Same contract otherwise: a history point only when the
-- price or its state changed. Old signature dropped so RPC calls by name stay unambiguous.
drop function if exists public.record_price(uuid, public.grade, text, integer, integer, text, timestamptz);
create or replace function public.record_price(
  p_parallel_id uuid,
  p_grade public.grade,
  p_source text,
  p_price_cents integer,
  p_sample_size integer default 0,
  p_buy_url text default null,
  p_captured_at timestamptz default now(),
  p_price_kind text default 'ask_median',
  p_sale_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_cents integer;
  existing_kind text;
begin
  select price_cents, price_kind into existing_cents, existing_kind
  from public.current_prices
  where parallel_id = p_parallel_id and grade = p_grade;

  if found and existing_cents = p_price_cents and existing_kind = p_price_kind then
    update public.current_prices
    set checked_at = p_captured_at,
        sample_size = p_sample_size,
        sale_at = coalesce(p_sale_at, sale_at),
        buy_url = coalesce(p_buy_url, buy_url),
        source = p_source
    where parallel_id = p_parallel_id and grade = p_grade;
    return false;
  end if;

  insert into public.price_points
    (parallel_id, grade, source, price_cents, sample_size, captured_at, price_kind, sale_at)
  values
    (p_parallel_id, p_grade, p_source, p_price_cents, p_sample_size, p_captured_at, p_price_kind, p_sale_at);

  insert into public.current_prices
    (parallel_id, grade, source, price_cents, sample_size, buy_url, captured_at, checked_at, price_kind, sale_at)
  values
    (p_parallel_id, p_grade, p_source, p_price_cents, p_sample_size, p_buy_url, p_captured_at, p_captured_at, p_price_kind, p_sale_at)
  on conflict (parallel_id, grade) do update
    set source = excluded.source,
        price_cents = excluded.price_cents,
        sample_size = excluded.sample_size,
        buy_url = coalesce(excluded.buy_url, public.current_prices.buy_url),
        captured_at = excluded.captured_at,
        checked_at = excluded.checked_at,
        price_kind = excluded.price_kind,
        sale_at = excluded.sale_at;
  return true;
end;
$$;
revoke execute on function public.record_price from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Mapping of our catalog to CardSight ids (ids only, never their lists)
-- ---------------------------------------------------------------------------
create table public.cardsight_sets (
  set_id uuid primary key references public.card_sets(id) on delete cascade,
  release_id uuid not null,
  release_name text not null,
  base_set_id uuid not null,
  base_set_card_count integer,
  mapped_at timestamptz not null default now()
);

create table public.cardsight_cards (
  card_id uuid primary key references public.cards(id) on delete cascade,
  cardsight_card_id uuid not null unique,
  matched_by text not null default 'number',
  mapped_at timestamptz not null default now()
);

-- One row per (set, parallel name) we already have in our catalog and that CardSight knows.
create table public.cardsight_parallels (
  set_id uuid not null references public.card_sets(id) on delete cascade,
  name text not null,
  cardsight_parallel_id uuid not null,
  mapped_at timestamptz not null default now(),
  primary key (set_id, name)
);

-- Short-term cache of raw API responses (their ToS §3(c)). Purged at the start of every run.
create table public.cardsight_cache (
  cache_key text primary key,
  body jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Raw listings, only when app_settings.price_source.store_raw_listings is true (off until
-- CardSight confirms in writing that history may be kept).
create table public.price_listings (
  id bigint generated always as identity primary key,
  parallel_id uuid not null references public.parallels(id) on delete cascade,
  grade public.grade not null,
  listing_type text not null check (listing_type in ('auction', 'fixed')),
  price_cents integer not null,
  listed_at timestamptz not null,
  source text not null,
  fetched_at timestamptz not null default now()
);
create index price_listings_parallel_idx on public.price_listings (parallel_id, grade, listed_at desc);

alter table public.cardsight_sets enable row level security;
alter table public.cardsight_cards enable row level security;
alter table public.cardsight_parallels enable row level security;
alter table public.cardsight_cache enable row level security;
alter table public.price_listings enable row level security;
revoke all on public.cardsight_sets from anon, authenticated;
revoke all on public.cardsight_cards from anon, authenticated;
revoke all on public.cardsight_parallels from anon, authenticated;
revoke all on public.cardsight_cache from anon, authenticated;
revoke all on public.price_listings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Settings: quota guard, passes, flags
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('price_source', jsonb_build_object(
    'provider', 'cardsight',
    'monthly_quota', 750,
    'guard_soft', 0.8,
    'guard_hard', 0.95,
    'reserve_calls', 10,
    'daily_card_cap', 300,
    'full_pass_weekday', 0,
    'period', '3m',
    'auction_min_sales', 3,
    'store_raw_listings', false
  ), 'CardSight: monthly quota and guard thresholds (80% = essential cards only, 95% = last night only + email), daily card cap, weekday of the full pass (0 = Sunday), lookback period, raw listings flag'),
  ('cardsight_grades', '{}'::jsonb, 'CardSight grade ids for PSA9 and PSA10, filled by job-catalog-map'),
  ('price_source_state', '{}'::jsonb, 'Runtime state of job-prices with CardSight: last full pass, guard emails, last usage read')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Work lists
-- ---------------------------------------------------------------------------
-- The weekly full pass: every card, Base plus the preferred parallels of its set (same ranking
-- as the showcase), raw; rookies' Base also in the rookie grades (PSA 10).
create or replace function public.full_pass_pairs()
returns table (parallel_id uuid, grade public.grade, reason text, priority integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cfg jsonb;
  prefs jsonb;
  v_per_card integer;
  v_grades public.grade[];
  v_rookie_base_grades public.grade[];
begin
  select value into cfg from public.app_settings where key = 'showcase';
  select value into prefs from public.app_settings where key = 'showcase_parallels';
  v_per_card := coalesce((cfg->>'parallels_per_card')::integer, 3);
  select coalesce(array_agg(x::public.grade), array['RAW'::public.grade]) into v_grades
    from jsonb_array_elements_text(coalesce(cfg->'grades', '["RAW"]'::jsonb)) x;
  select coalesce(array_agg(x::public.grade), array['RAW'::public.grade]) into v_rookie_base_grades
    from jsonb_array_elements_text(coalesce(cfg->'rookie_base_grades', '["RAW"]'::jsonb)) x;

  return query
  with parallel_rank as (
    select par.id as parallel_id, c.id as card_id, c.is_rookie, par.name,
      case when par.name = 'Base' then 0 else 1 end as base_first,
      coalesce((
        select pos from jsonb_array_elements_text(coalesce(prefs->s.slug, prefs->'default')) with ordinality as p(name, pos)
        where p.name = par.name or par.name like p.name || '%' limit 1
      ), 999) as pref_pos,
      coalesce((select max(cp.sample_size) from public.current_prices cp where cp.parallel_id = par.id), 0) as listings
    from public.cards c
    join public.card_sets s on s.id = c.set_id
    join public.parallels par on par.card_id = c.id
  ),
  chosen as (
    select *, row_number() over (partition by card_id order by base_first, pref_pos, listings desc, name) as rn
    from parallel_rank
  )
  select ch.parallel_id, g.grade, 'full_pass'::text, 9
  from chosen ch
  cross join lateral (
    select unnest(case when ch.is_rookie and ch.name = 'Base' then v_rookie_base_grades else v_grades end) as grade
  ) g
  where ch.rn <= v_per_card;
end;
$$;
revoke execute on function public.full_pass_pairs from public, anon, authenticated;

-- Work list for job-prices with CardSight: the usual priorities (collections, alerts, last
-- night, rookies, top players) plus, in 'full' mode, the full pass. Only cards and parallels
-- that are mapped: a parallel CardSight does not know is left out (Base always maps).
create or replace function public.cardsight_targets(p_mode text default 'daily')
returns table (
  parallel_id uuid,
  grade public.grade,
  reason text,
  priority integer,
  card_id uuid,
  cardsight_card_id uuid,
  cardsight_parallel_id uuid,
  parallel_name text,
  serial_run integer,
  card_number text,
  player_name text,
  set_name text,
  season text,
  current_cents integer,
  current_kind text
)
language sql
stable
security definer
set search_path = ''
as $$
  with wanted as (
    select t.parallel_id, t.grade, t.reason, t.priority from public.parallels_to_price(50) t
    union all
    select f.parallel_id, f.grade, f.reason, f.priority from public.full_pass_pairs() f where p_mode = 'full'
  ),
  dedup as (
    select w.parallel_id, w.grade, min(w.priority) as priority,
      (array_agg(w.reason order by w.priority))[1] as reason
    from wanted w group by w.parallel_id, w.grade
  )
  select d.parallel_id, d.grade, d.reason, d.priority, c.id, cc.cardsight_card_id,
    case when par.name = 'Base' then null else cpar.cardsight_parallel_id end,
    par.name, par.serial_run, c.number, pl.name, s.name, s.season, cp.price_cents, cp.price_kind
  from dedup d
  join public.parallels par on par.id = d.parallel_id
  join public.cards c on c.id = par.card_id
  join public.cardsight_cards cc on cc.card_id = c.id
  join public.players pl on pl.id = c.player_id
  join public.card_sets s on s.id = c.set_id
  left join public.cardsight_parallels cpar on cpar.set_id = s.id and cpar.name = par.name
  left join public.current_prices cp on cp.parallel_id = par.id and cp.grade = d.grade
  where par.name = 'Base' or cpar.cardsight_parallel_id is not null
  order by d.priority, pl.name, c.number, par.name, d.grade;
$$;
revoke execute on function public.cardsight_targets from public, anon, authenticated;

-- How many (parallel, grade) pairs the work list drops because the parallel is not mapped.
create or replace function public.cardsight_unmapped_count(p_mode text default 'daily')
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with wanted as (
    select t.parallel_id from public.parallels_to_price(50) t
    union
    select f.parallel_id from public.full_pass_pairs() f where p_mode = 'full'
  )
  select count(*)::integer
  from wanted w
  join public.parallels par on par.id = w.parallel_id
  join public.cards c on c.id = par.card_id
  left join public.cardsight_cards cc on cc.card_id = c.id
  left join public.cardsight_parallels cpar on cpar.set_id = c.set_id and cpar.name = par.name
  where cc.card_id is null or (par.name <> 'Base' and cpar.cardsight_parallel_id is null);
$$;
revoke execute on function public.cardsight_unmapped_count from public, anon, authenticated;
