begin;
select plan(5);

delete from public.standings_snapshots;
delete from public.lineup_scores;

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c1@courtvault.local', now(), now());

-- Captain Flagg 2 x 50 = 100, Wembanyama 60: the player of the game is Wembanyama (60 > 50).
insert into public.lineup_scores (user_id, game_day, total, counts, per_player) values
  ('00000000-0000-0000-0000-0000000000c1', '2026-10-22', 160, true, jsonb_build_array(
    jsonb_build_object('slot', 1, 'player_id', (select id from public.players where slug = 'cooper-flagg'), 'captain', true, 'played', true, 'fpts', 100),
    jsonb_build_object('slot', 2, 'player_id', (select id from public.players where slug = 'victor-wembanyama'), 'captain', false, 'played', true, 'fpts', 60)
  ));
insert into public.standings_snapshots (day, scope, period, period_key, user_id, rank, points) values
  ('2026-10-21', 'global', 'week', '2026-10-19', '00000000-0000-0000-0000-0000000000c1', 9, 100),
  ('2026-10-22', 'global', 'week', '2026-10-19', '00000000-0000-0000-0000-0000000000c1', 4, 260);

create temp table tmp_m as select summary from public.vault_score_morning('2026-10-22') where user_id = '00000000-0000-0000-0000-0000000000c1';
select is((select (summary ->> 'total')::numeric from tmp_m), 160::numeric, 'total of the night');
select is((select summary -> 'top' ->> 'name' from tmp_m), 'Victor Wembanyama', 'player of the game is ranked before the captain bonus');
select is((select (summary ->> 'rank')::integer from tmp_m), 4, 'week rank of the night');
select is((select (summary ->> 'movement')::integer from tmp_m), 5, 'movement against the previous snapshot');
select is((select count(*) from public.vault_score_morning('2026-10-23')), 0::bigint, 'nothing for a night without scores');

select * from finish();
rollback;
