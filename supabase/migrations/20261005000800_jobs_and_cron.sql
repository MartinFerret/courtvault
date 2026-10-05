-- Scheduled jobs. pg_cron runs in UTC; every job is scheduled at both US Eastern offsets
-- (EST = UTC-5, EDT = UTC-4). Edge functions skip when the local hour is before the target
-- and are idempotent per Eastern day through job_runs, so the second firing is a no-op.
--
-- Targets (America/New_York): stats 5:00, prices 5:30, alerts 6:00, morning push 8:00.
-- Configuration lives in Vault: `functions_url` (base URL of the edge functions) and
-- `job_secret` (sent as x-job-secret, checked by every job function). See seed.sql and README.

create or replace function public.invoke_job(p_job text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'functions_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'job_secret';

  if base_url is null or secret is null then
    raise warning 'invoke_job(%): vault secrets functions_url / job_secret are missing', p_job;
    return null;
  end if;

  return net.http_post(
    url := base_url || '/' || p_job,
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', secret),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke execute on function public.invoke_job from public, anon, authenticated;

-- Idempotency helpers used by the edge functions (service role only).
-- start_job_run returns true when the caller owns this run, false when it already ran.
create or replace function public.start_job_run(p_job text, p_run_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_status text;
begin
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

create or replace function public.finish_job_run(p_job text, p_run_key text, p_status text, p_error text default null, p_details jsonb default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.job_runs
  set status = p_status, finished_at = now(), error = p_error, details = p_details
  where job = p_job and run_key = p_run_key;
$$;
revoke execute on function public.finish_job_run from public, anon, authenticated;

-- Schedules (UTC). cron.schedule(name, ...) updates an existing job with the same name.

select cron.schedule('job-stats',   '0 9,10 * * *',  $$select public.invoke_job('job-stats')$$);
select cron.schedule('job-prices',  '30 9,10 * * *', $$select public.invoke_job('job-prices')$$);
select cron.schedule('job-alerts',  '0 10,11 * * *', $$select public.invoke_job('job-alerts')$$);
select cron.schedule('job-morning', '0 12,13 * * *', $$select public.invoke_job('job-morning')$$);
-- Pure SQL, no edge invocation: weekly history compaction (Sunday 11:00 UTC).
select cron.schedule('compact-price-points', '0 11 * * 0', $$select public.compact_price_points()$$);

-- Keep pg_cron's own log small.
select cron.schedule('cron-log-cleanup', '0 3 * * *', $$delete from cron.job_run_details where end_time < now() - interval '14 days'$$);
