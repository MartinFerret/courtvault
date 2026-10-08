begin;
select plan(27);

-- Game on for this transaction, 3 saves a day to test the rate limit quickly.
update public.app_settings set value = '{"enabled": true, "lineup_saves_per_day": 3, "lineup_size": 5}' where key = 'vault_score';
-- Independent of the local demo seed.
delete from public.fantasy_seasons where id <> '2026-27';
delete from public.game_days;
delete from public.lineup_scores;
delete from public.lineups;
delete from public.lineup_drafts;

-- Weights and seasons
select is(public.fantasy_points('2026-10-21', 20, 10, 5, 2, 1, 3), 45.5::numeric, 'default weights: 20 + 12 + 7.5 + 6 + 3 - 3');
select is(public.fantasy_points('2026-10-21', null, null, null, null, null, null), 0::numeric, 'missing stats count 0');
select is(public.is_regular_season_day('2026-10-19'), false, 'preseason day does not count');
select is(public.is_regular_season_day('2026-10-20'), true, 'opening night counts');
select is(public.is_regular_season_day('2027-04-11'), true, 'last regular-season day counts');
select is(public.is_regular_season_day('2027-04-12'), false, 'play-in does not count');
select has_column('public', 'player_game_lines', 'turnovers', 'turnovers stored');

-- A player with 6 players in the collection: 5 added two days ago, 1 added today.
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coach@courtvault.local', now(), now()),
       ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rival@courtvault.local', now(), now());

create temp table tmp_p as
select row_number() over (order by p.name) as n, p.id, min(pa.id::text)::uuid as parallel_id
from public.players p
join public.cards c on c.player_id = p.id
join public.parallels pa on pa.card_id = c.id
group by p.id, p.name
order by p.name
limit 6;
grant select on tmp_p to authenticated;

insert into public.collection_items (user_id, parallel_id, created_at)
select '00000000-0000-0000-0000-0000000000a1', parallel_id, case when n <= 5 then now() - interval '2 days' else now() end
from tmp_p;

select tests.authenticate_as('00000000-0000-0000-0000-0000000000a1');

select throws_like($$select public.set_lineup((select array_agg(id order by n) from tmp_p where n <= 4), (select id from tmp_p where n = 1))$$,
  'LINEUP_INVALID:size%', 'four players refused');
select throws_like($$select public.set_lineup(array[(select id from tmp_p where n = 1), (select id from tmp_p where n = 1), (select id from tmp_p where n = 2), (select id from tmp_p where n = 3), (select id from tmp_p where n = 4)], (select id from tmp_p where n = 1))$$,
  'LINEUP_INVALID:duplicate%', 'one slot per player');
select throws_like($$select public.set_lineup((select array_agg(id order by n) from tmp_p where n <= 5), (select id from tmp_p where n = 6))$$,
  'LINEUP_INVALID:captain%', 'captain must be in the lineup');
select throws_like($$select public.set_lineup((select array_agg(id order by n) from tmp_p where n <= 4) || (select id from public.players where id not in (select id from tmp_p) limit 1), (select id from tmp_p where n = 1))$$,
  'LINEUP_INVALID:not_owned%', 'unowned player refused');

select is(
  (public.set_lineup((select array_agg(id order by n) from tmp_p where n <= 5), (select id from tmp_p where n = 1)) -> 'pending_player_ids'),
  '[]'::jsonb, 'five eligible players: nothing pending');
select is(
  (public.set_lineup((select array_agg(id order by n) from tmp_p where n >= 2), (select id from tmp_p where n = 2)) -> 'pending_player_ids' ->> 0)::uuid,
  (select id from tmp_p where n = 6), 'a card added today counts from tomorrow');
select is((public.my_lineup() ->> 'saves_left')::integer, 1, 'my_lineup reports the saves left');
select lives_ok($$select public.set_lineup((select array_agg(id order by n) from tmp_p where n >= 2), (select id from tmp_p where n = 6))$$, 'third save allowed (captain added today)');
select throws_like($$select public.set_lineup((select array_agg(id order by n) from tmp_p where n <= 5), (select id from tmp_p where n = 1))$$,
  'RATE_LIMITED:lineup%', 'fourth save of the day refused');

-- Another user cannot read this lineup.
select tests.authenticate_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*) from public.lineup_drafts), 0::bigint, 'drafts are private');

-- Lock today at the first tip-off.
select tests.clear_auth();
insert into public.game_days (day, first_tip_at, games) values (public.eastern_day(), now() - interval '1 minute', 2);
select is(public.lock_due_game_days(), 1, 'due day locked');
select is(public.lock_due_game_days(), 0, 'lock is idempotent');
select is(
  (select array_position(player_ids, null) is not null from public.lineups where user_id = '00000000-0000-0000-0000-0000000000a1' and game_day = public.eastern_day()),
  true, 'the player added today leaves an empty slot');
select is(
  (select captain_id from public.lineups where user_id = '00000000-0000-0000-0000-0000000000a1' and game_day = public.eastern_day()),
  null, 'a captain added today is not captain today');
select is(public.next_lineup_day(), public.eastern_day() + 1, 'after the lock, changes apply to the next day');

-- Score: re-lock with captain n=2 to test x2 and a DNP.
update public.lineups set player_ids = (select array_agg(id order by n) from tmp_p where n <= 5), captain_id = (select id from tmp_p where n = 2)
where user_id = '00000000-0000-0000-0000-0000000000a1' and game_day = public.eastern_day();
insert into public.games (external_id, game_day, home_team, away_team, status, starts_at)
values ('test-vs-1', public.eastern_day(), 'Home', 'Away', 'final', now());
insert into public.player_game_lines (game_id, player_id, minutes, points, rebounds, assists, steals, blocks, turnovers)
select (select id from public.games where external_id = 'test-vs-1'), id, case when n = 5 then 0 else 30 end, 20, 10, 5, 2, 1, 3
from tmp_p where n <= 5;
select is(public.score_game_day(public.eastern_day()), 1, 'one lineup scored');
-- n=1,3,4 play: 45.5 each; n=2 captain: 91; n=5 DNP (0 minutes): 0. Total 227.5.
select is((select total from public.lineup_scores where user_id = '00000000-0000-0000-0000-0000000000a1' and game_day = public.eastern_day()), 227.5::numeric, 'captain doubles, DNP scores 0');
select is((select counts from public.lineup_scores where user_id = '00000000-0000-0000-0000-0000000000a1' and game_day = public.eastern_day()),
  public.is_regular_season_day(public.eastern_day()), 'counts follows the regular season');
select is(public.score_game_day(public.eastern_day()), 1, 'scoring is idempotent (upsert)');

-- Switched off: no lock, no score.
update public.app_settings set value = '{"enabled": false}' where key = 'vault_score';
insert into public.game_days (day, first_tip_at, games) values (public.eastern_day() + 1, now() - interval '1 minute', 1);
select is(public.lock_due_game_days(), 0, 'disabled game never locks');

select * from finish();
rollback;
