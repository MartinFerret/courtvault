begin;
select plan(12);

-- record_price only writes history when the price changes
select tests.clear_auth();
select is(public.record_price((select id from public.parallels order by id limit 1), 'PSA9', 'test', 123456, 5, null, now()), true, 'first price writes a point');
select is(public.record_price((select id from public.parallels order by id limit 1), 'PSA9', 'test', 123456, 6, null, now() + interval '1 minute'), false, 'same price writes nothing');
select is(public.record_price((select id from public.parallels order by id limit 1), 'PSA9', 'test', 123457, 6, null, now() + interval '2 minutes'), true, 'changed price writes a point');
select is((select price_cents from public.current_prices where parallel_id = (select id from public.parallels order by id limit 1) and grade = 'PSA9'), 123457, 'current price updated');

-- collection_summary for the demo user
select tests.authenticate_as('00000000-0000-0000-0000-000000000001');
select is((select item_count from public.collection_summary()), 8, 'summary counts 8 items');
select is(
  (select total_cents from public.collection_summary()),
  (select sum(cp.price_cents) from public.collection_items ci join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade where ci.user_id = '00000000-0000-0000-0000-000000000001'),
  'total equals the sum of current prices');
select is(
  (select added_cents from public.collection_summary()),
  (select sum(cp.price_cents) from public.collection_items ci join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade where ci.user_id = '00000000-0000-0000-0000-000000000001' and ci.created_at > now() - interval '24 hours'),
  'added value is the value of cards added in the last 24h');
select is((select change_24h_cents from public.collection_summary()), (select market_change_cents + added_cents from public.collection_summary()), '24h change = market + added');
select is((select gain_cents from public.collection_summary()), null, 'gains are hidden for free users');

-- morning_report: followed players get stats, owned-but-unfollowed players are locked for free users
select is((select points from public.morning_report() where player_slug = 'cooper-flagg'), 32, 'Flagg scored 32 last night');
select is((select locked from public.morning_report() where player_slug = 'anthony-edwards'), true, 'owned but unfollowed player is locked for a free user');

select tests.clear_auth();
update public.profiles set is_premium = true where id = '00000000-0000-0000-0000-000000000001';
select tests.authenticate_as('00000000-0000-0000-0000-000000000001');
select is((select points from public.morning_report() where player_slug = 'anthony-edwards'), 35, 'premium unlocks every owned player');

select * from finish();
rollback;
