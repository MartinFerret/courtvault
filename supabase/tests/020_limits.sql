begin;
select plan(7);

-- Lower the card limit so the test stays fast.
update public.plan_limits set free_value = 2 where key = 'cards';

-- A brand new user with no cards
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'limits@courtvault.local', now(), now());
select is((select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000003'), 1::bigint, 'profile created by trigger on sign-up');

select tests.authenticate_as('00000000-0000-0000-0000-000000000003');
prepare add_card as insert into public.collection_items (parallel_id) values ((select id from public.parallels order by id limit 1));
select lives_ok('add_card', 'card 1 ok');
select lives_ok('add_card', 'card 2 ok');
select throws_like('add_card', 'LIMIT_REACHED:cards%', 'card 3 refused with LIMIT_REACHED:cards');

-- Premium lifts the limit (set with the service role, i.e. postgres here)
select tests.clear_auth();
update public.profiles set is_premium = true, premium_until = now() + interval '30 days' where id = '00000000-0000-0000-0000-000000000003';
select tests.authenticate_as('00000000-0000-0000-0000-000000000003');
select lives_ok('add_card', 'premium user adds a 3rd card');

-- Followed players: demo user already follows 3
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-000000000001');
select throws_like(
  $$insert into public.followed_players (player_id) values ((select id from public.players where slug = 'stephen-curry'))$$,
  'LIMIT_REACHED:followed_players%', '4th followed player refused');

-- Expired premium counts as free
select tests.clear_auth();
update public.profiles set is_premium = true, premium_until = now() - interval '1 day' where id = '00000000-0000-0000-0000-000000000003';
select is(public.is_premium('00000000-0000-0000-0000-000000000003'), false, 'expired premium is not premium');

select * from finish();
rollback;
