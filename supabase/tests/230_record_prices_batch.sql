begin;
select plan(7);

create temp table tmp_p as
select array_agg(id order by id) as ids from (select id from public.parallels order by id limit 2) p;

-- record_prices: the record_price rule for a whole batch, returns the number of changes
select is(
  public.record_prices(jsonb_build_array(
    jsonb_build_object('parallel_id', (select ids[1] from tmp_p), 'grade', 'PSA9', 'source', 'test',
      'price_cents', 4321, 'sample_size', 4, 'captured_at', now(), 'price_kind', 'auction_median'),
    jsonb_build_object('parallel_id', (select ids[2] from tmp_p), 'grade', 'PSA9', 'source', 'test',
      'price_cents', 1234, 'captured_at', now())
  )),
  2, 'two new prices are two changes');
select is(
  (select price_cents from public.current_prices where parallel_id = (select ids[1] from tmp_p) and grade = 'PSA9'),
  4321, 'the current price is written');
select is(
  (select price_kind from public.current_prices where parallel_id = (select ids[2] from tmp_p) and grade = 'PSA9'),
  'ask_median', 'price kind defaults to the asking median');
select is(
  public.record_prices(jsonb_build_array(
    jsonb_build_object('parallel_id', (select ids[1] from tmp_p), 'grade', 'PSA9', 'source', 'test',
      'price_cents', 4321, 'sample_size', 5, 'captured_at', now() + interval '1 minute', 'price_kind', 'auction_median'),
    jsonb_build_object('parallel_id', (select ids[2] from tmp_p), 'grade', 'PSA9', 'source', 'test',
      'price_cents', 1300, 'captured_at', now() + interval '1 minute')
  )),
  1, 'an unchanged price is not a change');
select is(public.record_prices('[]'::jsonb), 0, 'an empty batch writes nothing');

-- start_job_run closes older runs of the same job left running by a killed function
insert into public.job_runs (job, run_key, status, started_at)
values ('test-job', '2026-01-01', 'running', now() - interval '2 days');
select is(public.start_job_run('test-job', '2026-01-02'), true, 'the new run starts');
select is(
  (select status from public.job_runs where job = 'test-job' and run_key = '2026-01-01'),
  'error', 'the stale run is marked as failed');

select * from finish();
rollback;
