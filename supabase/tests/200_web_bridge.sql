begin;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd1@courtvault.local', now(), now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd2@courtvault.local', now(), now());
update public.profiles set username = 'Referrer1' where id = '00000000-0000-0000-0000-0000000000d1';

-- Referral code and public referrer
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d1');
create temp table tmp_ref as select public.my_referral_code() as code;
grant select on tmp_ref to anon, authenticated;
select matches((select code from tmp_ref), '^[A-Z2-9]{8}$', 'referral code created');
select is(public.my_referral_code(), (select code from tmp_ref), 'the code is stable');
select is(public.set_acquisition(jsonb_build_object('ref', (select code from tmp_ref))), true, 'own attribution recorded');
select is((select referred_by from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'), null, 'nobody refers himself');

select tests.authenticate_as_anon();
select is(public.public_referrer((select lower(code) from tmp_ref)) ->> 'username', 'Referrer1', 'anon reads the referrer username');

-- Attribution of the second user: cleaned, linked, recorded once
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d2');
select is(public.set_acquisition(jsonb_build_object(
  'utm_source', 'tiktok', 'utm_campaign', 'bio', 'ref', (select code from tmp_ref), 'email', 'leak@x.com', 'utm_medium', repeat('x', 300)
)), true, 'attribution recorded');
select is(public.set_acquisition('{"utm_source": "later"}'), false, 'only the first touch is kept');
select tests.clear_auth();
select is((select acquisition ->> 'utm_source' from public.profiles where id = '00000000-0000-0000-0000-0000000000d2'), 'tiktok', 'utm kept');
select ok(not ((select acquisition from public.profiles where id = '00000000-0000-0000-0000-0000000000d2') ? 'email'), 'unknown keys dropped');
select ok(not ((select acquisition from public.profiles where id = '00000000-0000-0000-0000-0000000000d2') ? 'utm_medium'), 'oversized values dropped');
select is((select referred_by from public.profiles where id = '00000000-0000-0000-0000-0000000000d2'), '00000000-0000-0000-0000-0000000000d1'::uuid, 'referrer linked');

-- League invite info is public, members are not
insert into public.leagues (id, name, invite_code) values ('00000000-0000-0000-0000-0000000000e1', 'Bridge League', 'BRIDGE23');
insert into public.league_members (league_id, user_id, role) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'owner');
select tests.authenticate_as_anon();
select is(public.public_league_invite('bridge23'), '{"code": "BRIDGE23", "name": "Bridge League", "members": 1}'::jsonb, 'anon reads the invite');

-- Shares
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d1');
select throws_like($$select public.create_share('lineup')$$, 'SHARE_EMPTY:lineup%', 'no score, nothing to share');
create temp table tmp_share as select public.create_share('league', '00000000-0000-0000-0000-0000000000e1') as code;
grant select on tmp_share to anon, authenticated;
select matches((select code from tmp_share), '^[a-z2-9]{10}$', 'share code created');
select tests.authenticate_as_anon();
select is((public.public_share((select code from tmp_share)) -> 'payload' ->> 'league'), 'Bridge League', 'anon reads the share');
select ok(not ((public.public_share((select code from tmp_share)) -> 'payload') ? 'user_id'), 'the share never carries the user id');

select * from finish();
rollback;
