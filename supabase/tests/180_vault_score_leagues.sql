begin;
select plan(43);

update public.app_settings set value = '{"enabled": true, "lineup_saves_per_day": 20, "lineup_size": 5}' where key = 'vault_score';
-- Independent of the local demo seed.
delete from public.fantasy_seasons where id <> '2026-27';
delete from public.game_days;
delete from public.lineup_scores;
delete from public.lineups;
delete from public.leagues;
delete from public.badges;
delete from public.standings_snapshots;
update public.profiles set username = null;

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b1@courtvault.local', now() - interval '30 days', now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b2@courtvault.local', now() - interval '30 days', now()),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b3@courtvault.local', now() - interval '30 days', now()),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b4@courtvault.local', now() - interval '30 days', now());

-- ---------------------------------------------------------------------------
-- Usernames
-- ---------------------------------------------------------------------------
select is(public.is_name_allowed('CourtKing_23'), true, 'a normal name passes');
select is(public.is_name_allowed('classic_grass'), true, 'short words only match whole tokens (no Scunthorpe)');
select is(public.is_name_allowed('sh1tt3r'), false, 'leetspeak is folded');
select is(public.is_name_allowed('FUUUCK'), false, 'repeated letters are collapsed');
select is(public.is_name_allowed('NBA_insider'), false, 'league names are reserved');
select is(public.is_name_allowed('my_ass_42'), false, 'a short word as a whole token is caught');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');
select throws_like($$select public.set_username('ab')$$, 'USERNAME_INVALID:format%', 'too short');
select throws_like($$select public.set_username('has space')$$, 'USERNAME_INVALID:format%', 'spaces refused');
select throws_like($$select public.set_username('Admin_Paul')$$, 'USERNAME_INVALID:blocked%', 'impersonation refused');
select is(public.set_username('CourtKing'), 'CourtKing', 'username saved');
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b2');
select throws_like($$select public.set_username('courtking')$$, 'USERNAME_TAKEN%', 'uniqueness ignores case');
select lives_ok($$select public.set_username('Baseline')$$, 'second user named');
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b3');
select lives_ok($$select public.set_username('PaintBeast')$$, 'third user named');
select tests.clear_auth();
update public.profiles set username = 'NoLook' where id = '00000000-0000-0000-0000-0000000000b4';

-- ---------------------------------------------------------------------------
-- Leagues
-- ---------------------------------------------------------------------------
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');
create temp table tmp_league as select (public.create_league('Friday Hoops') ->> 'id')::uuid as id;
grant select on tmp_league to authenticated;
select matches((select invite_code from public.leagues where id = (select id from tmp_league)), '^[A-Z2-9]{8}$', 'invite code generated');
select throws_like($$select public.create_league('Second League')$$, 'LIMIT_REACHED:private_leagues%', 'free plan: one private league');
select throws_like($$select public.create_league('Shit Talkers')$$, 'LEAGUE_INVALID:blocked%', 'league names are filtered');

select tests.clear_auth();
create temp table tmp_code as select invite_code as code from public.leagues where id = (select id from tmp_league);
grant select on tmp_code to authenticated;

select tests.authenticate_as('00000000-0000-0000-0000-0000000000b2');
select is((public.join_league(lower((select code from tmp_code))) ->> 'name'), 'Friday Hoops', 'join by code (case-insensitive)');
select lives_ok($$select public.join_league((select code from tmp_code))$$, 'joining twice is harmless');
select is((select count(*) from public.league_members where league_id = (select id from tmp_league)), 2::bigint, 'members see the roster');
select throws_like($$select public.remove_league_member((select id from tmp_league), '00000000-0000-0000-0000-0000000000b1')$$, 'LEAGUE_FORBIDDEN%', 'only the owner removes members');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000b3');
select is((select count(*) from public.leagues where id = (select id from tmp_league)), 0::bigint, 'non-members cannot read the league');
select throws_like($$select public.league_page((select id from tmp_league))$$, 'LEAGUE_FORBIDDEN%', 'non-members cannot open the league page');
select throws_like($$select public.join_league('ZZZZZZZZ')$$, 'LEAGUE_NOT_FOUND%', 'unknown code');

-- Premium joins as many leagues as wanted.
select tests.clear_auth();
update public.profiles set is_premium = true, premium_until = now() + interval '30 days' where id = '00000000-0000-0000-0000-0000000000b3';
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b3');
select lives_ok($$select public.create_league('Paint Crew')$$, 'premium: first league');
select lives_ok($$select public.join_league((select code from tmp_code))$$, 'premium: second league');

-- ---------------------------------------------------------------------------
-- Standings: two regular-season days in the week of Monday 2026-10-19
-- ---------------------------------------------------------------------------
select tests.clear_auth();
update public.league_members set joined_day = '2026-10-22' where user_id = '00000000-0000-0000-0000-0000000000b3' and league_id = (select id from tmp_league);
insert into public.game_days (day, first_tip_at, games, locked_at, scored_at) values
  ('2026-10-21', '2026-10-21 23:00+00', 5, '2026-10-21 23:00+00', now()),
  ('2026-10-22', '2026-10-22 23:00+00', 5, '2026-10-22 23:00+00', now());
insert into public.lineup_scores (user_id, game_day, total, counts, per_player) values
  ('00000000-0000-0000-0000-0000000000b1', '2026-10-21', 150, true, '[]'),
  ('00000000-0000-0000-0000-0000000000b2', '2026-10-21', 120, true, '[]'),
  ('00000000-0000-0000-0000-0000000000b3', '2026-10-21', 300, true, '[]'),
  ('00000000-0000-0000-0000-0000000000b1', '2026-10-22', 100, true, '[]'),
  ('00000000-0000-0000-0000-0000000000b2', '2026-10-22', 210, true,
   '[{"slot":1,"captain":true,"played":true,"fpts":120},{"slot":2,"captain":false,"played":true,"fpts":40},{"slot":3,"captain":false,"played":true,"fpts":20},{"slot":4,"captain":false,"played":true,"fpts":20},{"slot":5,"captain":false,"played":true,"fpts":10}]'),
  ('00000000-0000-0000-0000-0000000000b3', '2026-10-22', 50, true, '[]'),
  ('00000000-0000-0000-0000-0000000000b4', '2026-10-22', 999, false, '[]');
select ok(public.refresh_standings('2026-10-21') > 0, 'snapshots for day 1');
select ok(public.refresh_standings('2026-10-22') > 0, 'snapshots for day 2');
select is(public.refresh_standings('2026-10-12'), 0, 'preseason days never enter the standings');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');
select throws_like($$select public.standings('global', null, 'week', '2026-10-19')$$, 'LIMIT_REACHED:game_history%', 'free: past weeks are Premium');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000b3');
create temp table tmp_s as select public.standings('global', null, 'week', '2026-10-19') as s;
select is((select s -> 'rows' -> 0 ->> 'username' from tmp_s), 'PaintBeast', 'week leader: 350 points');
select is((select (s -> 'rows' -> 1 ->> 'movement')::integer from tmp_s), 1, 'Baseline moved up one place');
select is((select (s ->> 'total')::integer from tmp_s), 3, 'non-counting days do not enter (NoLook has only preseason-like points)');
select is((select (s -> 'me' ->> 'rank')::integer from tmp_s), 1, 'my row is pinned');

-- League: PaintBeast joined on 2026-10-22, so only 50 points count there.
select is(
  (select (e ->> 'points')::numeric from jsonb_array_elements(public.standings('league', (select id from tmp_league), 'week', '2026-10-19') -> 'rows') e where e ->> 'username' = 'PaintBeast'),
  50::numeric, 'league standings count from the joined day');

-- Opt-out leaves the global ranking.
select ok(public.set_ranking_opt_out(true), 'opt-out saved');
select is((public.standings('global', null, 'week', '2026-10-19') ->> 'total')::integer, 2, 'opt-out leaves the global ranking');

-- ---------------------------------------------------------------------------
-- Badges, history, flags
-- ---------------------------------------------------------------------------
select tests.clear_auth();
select ok(public.award_badges('2026-10-22') > 0, 'badges awarded for the day');
select is((select count(*) from public.badges where user_id = '00000000-0000-0000-0000-0000000000b2' and kind in ('club_200', 'perfect_captain')), 2::bigint, '200 club and perfect captain');
insert into public.game_days (day, first_tip_at, games, scored_at) values ('2026-10-25', '2026-10-25 23:00+00', 3, now());
select lives_ok($$select public.award_badges('2026-10-25')$$, 'Sunday closes the week');
select is((select count(*) from public.badges where kind = 'weekly_winner' and scope = 'global' and period_key = '2026-10-19'), 1::bigint, 'one global weekly winner');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000b2');
select is((public.my_scores(30) ->> 'limited')::boolean, true, 'free history is limited');

select tests.clear_auth();
insert into public.lineup_events (user_id, action, details)
select '00000000-0000-0000-0000-0000000000b4', 'card_removed', '{"age_hours": 2}' from generate_series(1, 10);
select ok(public.flag_abuse(public.eastern_day()) >= 1, 'card churn flagged');

-- Account deletion with cards and leagues still works (removal trigger and owner hand-over).
insert into public.collection_items (user_id, parallel_id) select '00000000-0000-0000-0000-0000000000b1', id from public.parallels limit 1;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000b1';
select is((select role from public.league_members where league_id = (select id from tmp_league) and user_id = '00000000-0000-0000-0000-0000000000b2'), 'owner', 'the earliest member becomes owner');

select * from finish();
rollback;
