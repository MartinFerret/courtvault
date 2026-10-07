-- Public website modules: freshness of the data, and a player's form next to the value of his
-- reference card over the same dates. Read-only, anon-callable. Both report what the data says,
-- nothing is inferred: callers hide every part that comes back null.

-- When the prices were last updated and what last night covered.
create or replace function public.site_freshness()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select max(g.game_day) as day from public.games g
    where exists (select 1 from public.player_game_lines l where l.game_id = g.id)
  )
  select jsonb_build_object(
    'prices_updated_at', (select max(captured_at) from public.current_prices),
    'priced_cards', (select count(distinct par.card_id) from public.current_prices cp join public.parallels par on par.id = cp.parallel_id),
    'latest_game_day', (select day from latest),
    'games_last_night', (select count(*) from public.games g, latest where g.game_day = latest.day and g.home_score is not null),
    'players_last_night', (select count(distinct l.player_id) from public.player_game_lines l join public.games g on g.id = l.game_id, latest where g.game_day = latest.day)
  );
$$;
grant execute on function public.site_freshness() to anon, authenticated;

-- Form badge rule (documented on /how-we-price-cards): points + rebounds + assists per game,
-- last 5 games against the season average (every tracked game since September 1 of the current
-- season, preseason included). Hot when the last 5 average at least 15% above the season
-- average, cold when at least 15% below, nothing otherwise. Needs 10 tracked games. Stats only.
create or replace function public.player_form(p_player_id uuid, p_games integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_season_start date;
  v_games jsonb;
  v_season_games integer;
  v_season_pra numeric;
  v_last5_games integer;
  v_last5_pra numeric;
  v_badge text;
  v_parallel uuid;
  v_price jsonb;
begin
  -- The season starts on September 1; from January to August we are still in last year's season.
  v_season_start := make_date(
    extract(year from (now() at time zone 'America/New_York'))::integer
      - case when extract(month from (now() at time zone 'America/New_York')) < 9 then 1 else 0 end,
    9, 1);

  with lines as (
    select g.game_day, g.home_team, g.away_team, g.home_score, g.away_score,
      l.points, l.rebounds, l.assists, l.minutes,
      coalesce(l.points, 0) + coalesce(l.rebounds, 0) + coalesce(l.assists, 0) as pra,
      row_number() over (order by g.game_day desc) as recency
    from public.player_game_lines l
    join public.games g on g.id = l.game_id
    where l.player_id = p_player_id and g.game_day >= v_season_start and g.home_score is not null
  )
  select
    (select coalesce(jsonb_agg(jsonb_build_object(
        'day', game_day, 'home_team', home_team, 'away_team', away_team,
        'home_score', home_score, 'away_score', away_score,
        'points', points, 'rebounds', rebounds, 'assists', assists, 'minutes', minutes, 'pra', pra
      ) order by game_day), '[]'::jsonb) from lines where recency <= p_games),
    (select count(*) from lines),
    (select round(avg(pra), 1) from lines),
    (select count(*) from lines where recency <= 5),
    (select round(avg(pra), 1) from lines where recency <= 5)
  into v_games, v_season_games, v_season_pra, v_last5_games, v_last5_pra;

  v_badge := case
    when v_season_games >= 10 and v_last5_games = 5 and v_season_pra > 0 and v_last5_pra >= 1.15 * v_season_pra then 'hot'
    when v_season_games >= 10 and v_last5_games = 5 and v_season_pra > 0 and v_last5_pra <= 0.85 * v_season_pra then 'cold'
    else null end;

  -- Reference card: the player's Base parallel with the highest current raw price.
  select par.id into v_parallel
  from public.current_prices cp
  join public.parallels par on par.id = cp.parallel_id
  join public.cards c on c.id = par.card_id
  where c.player_id = p_player_id and par.name = 'Base' and cp.grade = 'RAW'
  order by cp.price_cents desc limit 1;

  if v_parallel is not null then
    select jsonb_build_object(
      'card_slug', c.slug, 'public_slug', c.public_slug, 'card_number', c.number, 'is_rookie', c.is_rookie,
      'set_name', s.name, 'season', s.season, 'parallel_name', par.name, 'grade', 'RAW',
      'current_cents', cp.price_cents, 'captured_at', cp.captured_at,
      -- Value known the morning after each game (after the 5:30 AM ET price update).
      'series', (
        select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'cents', d.cents) order by d.day), '[]'::jsonb)
        from (
          select (e->>'day')::date as day,
            public.price_at(par.id, 'RAW', (((e->>'day')::date + 1)::timestamp + interval '10 hours') at time zone 'America/New_York') as cents
          from jsonb_array_elements(v_games) e
        ) d
      )
    ) into v_price
    from public.parallels par
    join public.cards c on c.id = par.card_id
    join public.card_sets s on s.id = c.set_id
    join public.current_prices cp on cp.parallel_id = par.id and cp.grade = 'RAW'
    where par.id = v_parallel;
  end if;

  return jsonb_build_object(
    'games', v_games,
    'season', jsonb_build_object('games', v_season_games, 'pra_avg', v_season_pra, 'since', v_season_start),
    'last5', jsonb_build_object('games', v_last5_games, 'pra_avg', v_last5_pra),
    'badge', v_badge,
    'price', v_price
  );
end;
$$;
grant execute on function public.player_form(uuid, integer) to anon, authenticated;
