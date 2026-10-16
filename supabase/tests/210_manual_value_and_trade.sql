begin;
select plan(15);

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f1@courtvault.local', now(), now()),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f2@courtvault.local', now(), now());
update public.profiles set username = 'Trader1' where id = '00000000-0000-0000-0000-0000000000f1';

-- One priced parallel (RAW) and one without any RAW price.
create temp table tmp_p as
select
  (select parallel_id from public.current_prices where grade = 'RAW' order by price_cents desc limit 1) as priced,
  (select id from public.parallels pa
   where not exists (select 1 from public.current_prices cp where cp.parallel_id = pa.id and cp.grade = 'RAW')
   order by id limit 1) as unpriced;
grant select on tmp_p to anon, authenticated;

insert into public.collection_items (id, user_id, parallel_id, grade, purchase_cents, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', (select priced from tmp_p), 'RAW', null, now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', (select unpriced from tmp_p), 'RAW', 1000, now() - interval '3 days');

-- Manual value: owner only, validated, fallback only
select tests.authenticate_as('00000000-0000-0000-0000-0000000000f2');
select throws_like($$select public.set_manual_value('00000000-0000-0000-0000-0000000000a2', 2500)$$, '%ITEM_NOT_FOUND%', 'nobody sets a value on another collector''s card');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000f1');
select throws_like($$select public.set_manual_value('00000000-0000-0000-0000-0000000000a2', -1)$$, '%MANUAL_VALUE_INVALID%', 'negative values are refused');
select lives_ok($$select public.set_manual_value('00000000-0000-0000-0000-0000000000a2', 2500)$$, 'owner sets a manual value');
select lives_ok($$select public.set_manual_value('00000000-0000-0000-0000-0000000000a1', 1)$$, 'a manual value can sit on a priced card');

select is(
  (select value_cents || ' ' || value_source from public.collection_items_detailed where id = '00000000-0000-0000-0000-0000000000a2'),
  '2500 manual', 'unpriced card is worth its manual value');
select is(
  (select value_source from public.collection_items_detailed where id = '00000000-0000-0000-0000-0000000000a1'),
  'market', 'the market price wins over a manual value');
select is(
  (select total_cents from public.collection_summary()),
  (select price_cents from public.current_prices where parallel_id = (select priced from tmp_p) and grade = 'RAW')::bigint + 2500,
  'total = market price + manual value');
select is((select added_cents from public.collection_summary()), 0::bigint, 'nothing was added in the last 24h');

select lives_ok($$select public.set_manual_value('00000000-0000-0000-0000-0000000000a2', null)$$, 'a manual value can be cleared');
select is((select value_cents from public.collection_items_detailed where id = '00000000-0000-0000-0000-0000000000a2'), null, 'cleared value is gone');

-- Trade analyzer
select is(
  public.trade_value(jsonb_build_array(
    jsonb_build_object('side', 'give', 'parallel_id', (select priced from tmp_p), 'grade', 'RAW'),
    jsonb_build_object('side', 'get', 'parallel_id', (select priced from tmp_p), 'grade', 'RAW')
  )) ->> 'verdict', 'fair', 'the same card on both sides is a fair trade');
select is(
  public.trade_value(jsonb_build_array(
    jsonb_build_object('side', 'give', 'parallel_id', (select unpriced from tmp_p), 'grade', 'RAW'),
    jsonb_build_object('side', 'get', 'parallel_id', (select priced from tmp_p), 'grade', 'RAW')
  )) ->> 'verdict', 'unknown', 'a side without any price gives no verdict');
select throws_like(
  $$select public.trade_value(jsonb_build_array(jsonb_build_object('side', 'give', 'parallel_id', (select priced from tmp_p), 'grade', 'RAW')))$$,
  '%TRADE_INVALID:size%', 'both sides need a card');

create temp table tmp_share as select public.create_trade_share(jsonb_build_array(
  jsonb_build_object('side', 'give', 'parallel_id', (select priced from tmp_p), 'grade', 'RAW'),
  jsonb_build_object('side', 'get', 'parallel_id', (select unpriced from tmp_p), 'grade', 'RAW')
)) as code;
grant select on tmp_share to anon, authenticated;

select tests.authenticate_as_anon();
select is(
  (select public.public_share(code) -> 'payload' ->> 'username' from tmp_share), 'Trader1',
  'a saved trade is public by link');
select throws_like($$select public.trade_value('[]'::jsonb)$$, '%permission denied%', 'anon cannot run the analyzer directly');

select * from finish();
rollback;
