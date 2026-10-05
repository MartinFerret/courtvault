begin;
select plan(14);

-- Catalog is public
select tests.authenticate_as_anon();
select ok((select count(*) from public.players) > 0, 'anon reads players');
select ok((select count(*) from public.current_prices) > 0, 'anon reads current prices');
select is((select count(*) from public.profiles), 0::bigint, 'anon cannot read profiles');
select is((select count(*) from public.collection_items), 0::bigint, 'anon cannot read collections');
select throws_ok(
  $$insert into public.collection_items (user_id, parallel_id) values ('00000000-0000-0000-0000-000000000001', (select id from public.parallels limit 1))$$,
  '42501', null, 'anon cannot insert collection items');
select lives_ok($$insert into public.waitlist (email, source) values ('rls-test@example.com', 'test')$$, 'anon can join the waitlist');
select throws_ok($$select * from public.waitlist$$, '42501', null, 'anon cannot read the waitlist');

-- Users only see their own rows
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-000000000001');
select is((select count(*) from public.collection_items), 8::bigint, 'demo user sees only own 8 items');
select is((select count(*) from public.profiles), 1::bigint, 'demo user sees only own profile');

select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.collection_items), 1::bigint, 'other user sees only own 1 item');
select is((select count(*) from public.collection_items where user_id = '00000000-0000-0000-0000-000000000001'), 0::bigint,
  'other user cannot read the demo collection even by filtering');

-- Premium cannot be self-granted
select throws_ok(
  $$update public.profiles set is_premium = true where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'a user cannot grant themselves Premium');
select lives_ok(
  $$update public.profiles set push_token = 'token-123' where id = '00000000-0000-0000-0000-000000000002'$$,
  'a user can update their push token');

-- Free users see at most 30 days of price history
select is(
  (select count(*) from public.price_points where captured_at < now() - interval '31 days'),
  0::bigint,
  'free user cannot read price points older than the plan window');

select * from finish();
rollback;
