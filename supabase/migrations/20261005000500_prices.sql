-- Price recording and compaction. Keeps price_points small: one row per actual change,
-- daily granularity for 90 days, weekly up to a year, monthly beyond.

create view public.latest_prices
with (security_invoker = true) as
select parallel_id, grade, source, price_cents, sample_size, buy_url, captured_at, checked_at
from public.current_prices;

-- Called by job-prices (service role). Returns true when a new history point was written.
create or replace function public.record_price(
  p_parallel_id uuid,
  p_grade public.grade,
  p_source text,
  p_price_cents integer,
  p_sample_size integer default 0,
  p_buy_url text default null,
  p_captured_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing integer;
begin
  select price_cents into existing
  from public.current_prices
  where parallel_id = p_parallel_id and grade = p_grade;

  if found and existing = p_price_cents then
    update public.current_prices
    set checked_at = p_captured_at,
        sample_size = p_sample_size,
        buy_url = coalesce(p_buy_url, buy_url),
        source = p_source
    where parallel_id = p_parallel_id and grade = p_grade;
    return false;
  end if;

  insert into public.price_points (parallel_id, grade, source, price_cents, sample_size, captured_at)
  values (p_parallel_id, p_grade, p_source, p_price_cents, p_sample_size, p_captured_at);

  insert into public.current_prices
    (parallel_id, grade, source, price_cents, sample_size, buy_url, captured_at, checked_at)
  values
    (p_parallel_id, p_grade, p_source, p_price_cents, p_sample_size, p_buy_url, p_captured_at, p_captured_at)
  on conflict (parallel_id, grade) do update
    set source = excluded.source,
        price_cents = excluded.price_cents,
        sample_size = excluded.sample_size,
        buy_url = coalesce(excluded.buy_url, public.current_prices.buy_url),
        captured_at = excluded.captured_at,
        checked_at = excluded.checked_at;
  return true;
end;
$$;
revoke execute on function public.record_price from public, anon, authenticated;

-- Price known at a given instant: the last point captured on or before it.
create or replace function public.price_at(p_parallel_id uuid, p_grade public.grade, p_at timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select price_cents
  from public.price_points
  where parallel_id = p_parallel_id and grade = p_grade and captured_at <= p_at
  order by captured_at desc
  limit 1;
$$;
revoke execute on function public.price_at from public, anon, authenticated;

-- (parallel, grade) pairs worth pricing: every pair present in a collection or a pending
-- alert, plus RAW Base for the top rookie cards. job-prices reads this (service role).
create or replace function public.parallels_to_price(p_rookie_limit integer default 50)
returns table (
  parallel_id uuid,
  grade public.grade,
  parallel_name text,
  serial_run integer,
  card_number text,
  player_name text,
  set_name text,
  season text,
  reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  with wanted as (
    select ci.parallel_id, ci.grade, 'collection'::text as reason from public.collection_items ci
    union
    select pa.parallel_id, pa.grade, 'alert' from public.price_alerts pa where pa.triggered_at is null
    union
    (
      select par.id, 'RAW'::public.grade, 'rookie'
      from public.cards c
      join public.parallels par on par.card_id = c.id and par.name = 'Base'
      where c.is_rookie
      order by c.created_at
      limit p_rookie_limit
    )
  )
  select distinct on (par.id, w.grade)
    par.id, w.grade, par.name, par.serial_run, c.number, pl.name, s.name, s.season, w.reason
  from wanted w
  join public.parallels par on par.id = w.parallel_id
  join public.cards c on c.id = par.card_id
  join public.players pl on pl.id = c.player_id
  join public.card_sets s on s.id = c.set_id
  order by par.id, w.grade, w.reason;
$$;
revoke execute on function public.parallels_to_price from public, anon, authenticated;

-- Scheduled weekly. Beyond 90 days keep the last point per ISO week; beyond 365 days per month.
create or replace function public.compact_price_points()
returns table (deleted_weekly bigint, deleted_monthly bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  weekly bigint;
  monthly bigint;
begin
  with ranked as (
    select parallel_id, grade, captured_at,
      row_number() over (
        partition by parallel_id, grade, date_trunc('week', captured_at)
        order by captured_at desc
      ) as rn
    from public.price_points
    where captured_at < now() - interval '90 days'
      and captured_at >= now() - interval '365 days'
  )
  delete from public.price_points p
  using ranked r
  where p.parallel_id = r.parallel_id and p.grade = r.grade and p.captured_at = r.captured_at and r.rn > 1;
  get diagnostics weekly = row_count;

  with ranked as (
    select parallel_id, grade, captured_at,
      row_number() over (
        partition by parallel_id, grade, date_trunc('month', captured_at)
        order by captured_at desc
      ) as rn
    from public.price_points
    where captured_at < now() - interval '365 days'
  )
  delete from public.price_points p
  using ranked r
  where p.parallel_id = r.parallel_id and p.grade = r.grade and p.captured_at = r.captured_at and r.rn > 1;
  get diagnostics monthly = row_count;

  return query select weekly, monthly;
end;
$$;
revoke execute on function public.compact_price_points from public, anon, authenticated;
