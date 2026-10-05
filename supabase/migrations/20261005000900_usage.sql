-- Free-tier watchdog: database size, storage, rows and job activity. Service role / dashboard only.
-- Supabase Free limits to watch: ~500 MB database, 1 GB storage, 500k edge invocations/month,
-- pause after 7 days without activity. Edge invocation totals are only visible in the dashboard.

create or replace function public.usage_report()
returns table (metric text, value numeric, unit text, note text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'database_size', pg_database_size(current_database())::numeric / 1048576, 'MB', 'Free plan: 500 MB'
  union all
  select 'price_points_size', pg_total_relation_size('public.price_points')::numeric / 1048576, 'MB', 'table + indexes'
  union all
  select 'price_points_rows', (select count(*) from public.price_points)::numeric, 'rows', null
  union all
  select 'tracked_parallels', (select count(distinct parallel_id) from public.current_prices)::numeric, 'parallels', 'priced at least once'
  union all
  select 'storage_size', (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects where bucket_id = 'card-photos')::numeric / 1048576, 'MB', 'Free plan: 1 GB'
  union all
  select 'storage_objects', (select count(*) from storage.objects where bucket_id = 'card-photos')::numeric, 'files', null
  union all
  select 'users', (select count(*) from public.profiles)::numeric, 'users', null
  union all
  select 'premium_users', (select count(*) from public.profiles where is_premium)::numeric, 'users', null
  union all
  select 'collection_items', (select count(*) from public.collection_items)::numeric, 'rows', null
  union all
  select 'job_runs_30d', (select count(*) from public.job_runs where started_at > now() - interval '30 days')::numeric, 'runs', 'scheduled edge invocations (excludes app traffic)'
  union all
  select 'job_errors_7d', (select count(*) from public.job_runs where status = 'error' and started_at > now() - interval '7 days')::numeric, 'runs', null
  union all
  select 'last_activity', extract(epoch from now() - (select max(started_at) from public.job_runs)) / 3600, 'hours ago', 'last scheduled job; the project pauses after 7 idle days';
$$;
revoke execute on function public.usage_report from public, anon, authenticated;
