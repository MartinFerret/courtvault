begin;
select plan(3);

-- Synthetic history: daily points for 200 days on one parallel/grade.
select tests.clear_auth();
insert into public.price_points (parallel_id, grade, captured_at, price_cents, sample_size, source)
select (select id from public.parallels order by id limit 1), 'PSA10', now() - (d || ' days')::interval, 1000 + d, 1, 'test'
from generate_series(1, 200) d
on conflict do nothing;

select ok((select count(*) from public.price_points where grade = 'PSA10' and source = 'test') = 200, '200 synthetic points inserted');
select ok((select deleted_weekly from public.compact_price_points()) > 80, 'weekly compaction deleted most points older than 90 days');
select is(
  (select count(*) from public.price_points where grade = 'PSA10' and source = 'test' and captured_at < now() - interval '90 days'),
  (select count(distinct date_trunc('week', captured_at)) from public.price_points where grade = 'PSA10' and source = 'test' and captured_at < now() - interval '90 days'),
  'one point per week remains beyond 90 days');

select * from finish();
rollback;
