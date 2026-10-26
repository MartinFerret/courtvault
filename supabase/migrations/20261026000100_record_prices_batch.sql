-- job-prices: batch price writes, and runs killed by the platform no longer stay "running".
--
-- The weekly full pass (Sunday) wrote ~3,900 prices with one record_price() RPC each and hit
-- the 150 s wall clock of Supabase Free edge functions on 2026-10-25. record_prices() applies
-- the same rule to a whole batch in one round trip.

-- ---------------------------------------------------------------------------
-- 1. record_prices(): record_price() for each element of a JSON array
-- ---------------------------------------------------------------------------
-- Each element: {parallel_id, grade, source, price_cents, sample_size, buy_url, captured_at,
-- price_kind, sale_at}. Returns how many prices changed (history points written).
create or replace function public.record_prices(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  changed integer := 0;
begin
  for r in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    if public.record_price(
      (r ->> 'parallel_id')::uuid,
      (r ->> 'grade')::public.grade,
      r ->> 'source',
      (r ->> 'price_cents')::integer,
      coalesce((r ->> 'sample_size')::integer, 0),
      r ->> 'buy_url',
      coalesce((r ->> 'captured_at')::timestamptz, now()),
      coalesce(r ->> 'price_kind', 'ask_median'),
      (r ->> 'sale_at')::timestamptz
    ) then
      changed := changed + 1;
    end if;
  end loop;
  return changed;
end;
$$;
revoke execute on function public.record_prices from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. start_job_run(): close runs of the same job left "running" for over an hour
-- ---------------------------------------------------------------------------
-- A function killed by the platform never reaches finish_job_run(); its row used to stay
-- "running" forever once the next day's run had started.
create or replace function public.start_job_run(p_job text, p_run_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_status text;
begin
  update public.job_runs
  set status = 'error',
      finished_at = now(),
      error = 'No finish recorded: stopped by the platform (time limit) or crashed'
  where job = p_job
    and run_key <> p_run_key
    and status = 'running'
    and started_at < now() - interval '1 hour';

  insert into public.job_runs (job, run_key, status)
  values (p_job, p_run_key, 'running')
  on conflict (job, run_key) do nothing;
  if found then
    return true;
  end if;
  select status into existing_status from public.job_runs where job = p_job and run_key = p_run_key;
  -- Allow a retry after a failure or a run stuck for more than an hour.
  if existing_status = 'error' or (
    existing_status = 'running' and exists (
      select 1 from public.job_runs
      where job = p_job and run_key = p_run_key and started_at < now() - interval '1 hour'
    )
  ) then
    update public.job_runs
    set status = 'running', started_at = now(), finished_at = null, error = null
    where job = p_job and run_key = p_run_key;
    return true;
  end if;
  return false;
end;
$$;
revoke execute on function public.start_job_run from public, anon, authenticated;
