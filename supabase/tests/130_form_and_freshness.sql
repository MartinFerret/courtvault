begin;
select plan(8);

-- Freshness reads what exists, never invents.
select ok((public.site_freshness()->>'latest_game_day') is not null, 'freshness knows the latest game night');
select ok((public.site_freshness()->>'games_last_night')::integer >= 1, 'freshness counts the games of that night');

-- A player with 12 games this season, the last 5 well above the average: hot.
insert into public.players (slug, name) values ('testo-hotson', 'Testo Hotson');
insert into public.games (external_id, game_day, home_team, away_team, home_score, away_score, status)
  select 'test-' || i, current_date - i, 'Home', 'Away', 100, 90, 'final' from generate_series(1, 12) i;
insert into public.player_game_lines (game_id, player_id, points, rebounds, assists)
  select g.id, (select id from public.players where slug = 'testo-hotson'),
    case when g.external_id in ('test-1','test-2','test-3','test-4','test-5') then 30 else 10 end, 5, 5
  from public.games g where g.external_id like 'test-%';

select is(public.player_form((select id from public.players where slug = 'testo-hotson'))->>'badge', 'hot', 'last five far above the season average: hot');
select is((public.player_form((select id from public.players where slug = 'testo-hotson'))->'season'->>'games')::integer, 12, 'season games counted');
select is(jsonb_array_length(public.player_form((select id from public.players where slug = 'testo-hotson'), 10)->'games'), 10, 'last 10 games returned');
select ok(public.player_form((select id from public.players where slug = 'testo-hotson'))->'price' = 'null'::jsonb, 'no priced card: no price track');

-- Fewer than 10 games: no badge, whatever the numbers.
delete from public.player_game_lines where game_id in (select id from public.games where external_id in ('test-11', 'test-12', 'test-10'));
select ok(public.player_form((select id from public.players where slug = 'testo-hotson'))->>'badge' is null, 'under 10 games: no badge');

-- The seed player with prices gets a price track aligned on his game days.
select ok(
  (public.player_form((select id from public.players where slug = 'cooper-flagg'))->'price'->'series') is not null,
  'priced player: series present');

select * from finish();
rollback;
