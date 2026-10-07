-- Public website review (2026-10-07): preseason label from the official schedule, rookie flag
-- on the performances of the night, and a public price history for card pages.

-- Regular season start, from the official NBA schedule (nba.com/news/key-dates). Games before
-- this date are preseason. Updated by hand each season; nothing in code carries a date.
insert into public.app_settings (key, value, description) values
  ('season_start', to_jsonb('2026-10-20'::text),
   'First day of the NBA regular season, from https://www.nba.com/news/key-dates. Game days before it are labelled Preseason.')
on conflict (key) do update set value = excluded.value, description = excluded.description, updated_at = now();

-- public_last_night: adds is_rookie per performance and is_preseason on the night.
create or replace function public.public_last_night(
  p_day date default null,
  p_min_sample integer default 5,
  p_min_price_cents integer default 500,
  p_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_latest date;
  v_day date;
  v_before timestamptz;
  v_after timestamptz;
  v_today date := (now() at time zone 'America/New_York')::date;
  v_games jsonb;
  v_gainers jsonb;
  v_losers jsonb;
  v_perf jsonb;
begin
  select max(g.game_day) into v_latest
  from public.games g
  where exists (select 1 from public.player_game_lines l where l.game_id = g.id);

  if v_latest is null then
    return jsonb_build_object('day', null, 'requested_day', p_day, 'is_off_day', true, 'games', '[]'::jsonb,
      'gainers', '[]'::jsonb, 'losers', '[]'::jsonb, 'performances', '[]'::jsonb);
  end if;

  if p_day is not null then
    if not exists (
      select 1 from public.games g where g.game_day = p_day
      and exists (select 1 from public.player_game_lines l where l.game_id = g.id)
    ) then
      return null; -- unknown archive day: the website answers 404
    end if;
    v_day := p_day;
  else
    v_day := v_latest;
  end if;

  v_before := (v_day::timestamp + interval '18 hours') at time zone 'America/New_York';
  v_after := least(((v_day + 1)::timestamp + interval '23 hours 59 minutes') at time zone 'America/New_York', now());

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'home_team', g.home_team, 'away_team', g.away_team,
      'home_score', g.home_score, 'away_score', g.away_score, 'status', g.status
    ) order by g.starts_at nulls last, g.home_team), '[]'::jsonb)
  into v_games
  from public.games g where g.game_day = v_day;

  with played as (
    select l.player_id, l.points, l.rebounds, l.assists, l.steals, l.blocks, l.minutes, g.id as game_id,
      g.home_team, g.away_team, g.home_score, g.away_score,
      (coalesce(l.points, 0) + 1.2 * coalesce(l.rebounds, 0) + 1.5 * coalesce(l.assists, 0)
        + 3 * coalesce(l.steals, 0) + 3 * coalesce(l.blocks, 0)) as game_score
    from public.player_game_lines l
    join public.games g on g.id = l.game_id
    where g.game_day = v_day
  ),
  priced as (
    select par.id as parallel_id, cp.grade, cp.sample_size,
      c.id as card_id, c.slug as card_slug, c.number as card_number, c.is_rookie,
      pl.id as player_id, pl.name as player_name, pl.slug as player_slug,
      s.name as set_name, s.season, par.name as parallel_name, par.serial_run,
      public.price_at(par.id, cp.grade, v_before) as before_cents,
      public.price_at(par.id, cp.grade, v_after) as after_cents
    from public.current_prices cp
    join public.parallels par on par.id = cp.parallel_id
    join public.cards c on c.id = par.card_id
    join public.players pl on pl.id = c.player_id
    join public.card_sets s on s.id = c.set_id
    where pl.id in (select player_id from played)
      and cp.sample_size >= p_min_sample
      and cp.price_cents >= p_min_price_cents
  ),
  movers as (
    select p.*, (p.after_cents - p.before_cents) as change_cents,
      round(100.0 * (p.after_cents - p.before_cents) / p.before_cents, 1) as change_pct,
      (select jsonb_build_object('points', pd.points, 'rebounds', pd.rebounds, 'assists', pd.assists,
          'steals', pd.steals, 'blocks', pd.blocks, 'minutes', pd.minutes,
          'home_team', pd.home_team, 'away_team', pd.away_team, 'home_score', pd.home_score, 'away_score', pd.away_score)
       from played pd where pd.player_id = p.player_id order by pd.minutes desc nulls last limit 1) as line
    from priced p
    where p.before_cents is not null and p.after_cents is not null
      and p.before_cents > 0 and p.after_cents <> p.before_cents
  ),
  mover_json as (
    select m.*, jsonb_build_object(
      'card_slug', m.card_slug, 'card_number', m.card_number, 'is_rookie', m.is_rookie,
      'player_name', m.player_name, 'player_slug', m.player_slug,
      'set_name', m.set_name, 'season', m.season,
      'parallel_name', m.parallel_name, 'serial_run', m.serial_run, 'grade', m.grade,
      'sample_size', m.sample_size, 'before_cents', m.before_cents, 'after_cents', m.after_cents,
      'change_cents', m.change_cents, 'change_pct', m.change_pct, 'line', m.line
    ) as j
    from movers m
  ),
  -- At most 3 cards per player in each list, so one player's parallels cannot fill the page.
  ranked as (
    select mj.*,
      row_number() over (partition by mj.player_id order by mj.change_pct desc, mj.change_cents desc) as rank_up,
      row_number() over (partition by mj.player_id order by mj.change_pct asc, mj.change_cents asc) as rank_down
    from mover_json mj
  ),
  gainers as (
    select coalesce(jsonb_agg(j order by change_pct desc, change_cents desc), '[]'::jsonb) as j
    from (select * from ranked where change_cents > 0 and rank_up <= 3 order by change_pct desc, change_cents desc limit p_limit) g
  ),
  losers as (
    select coalesce(jsonb_agg(j order by change_pct asc, change_cents asc), '[]'::jsonb) as j
    from (select * from ranked where change_cents < 0 and rank_down <= 3 order by change_pct asc, change_cents asc limit p_limit) l
  ),
  perf as (
    select coalesce(jsonb_agg(jsonb_build_object(
        'player_name', pl.name, 'player_slug', pl.slug, 'team', pl.team,
        'is_rookie', exists (select 1 from public.cards rc where rc.player_id = pl.id and rc.is_rookie),
        'points', pd.points, 'rebounds', pd.rebounds, 'assists', pd.assists,
        'steals', pd.steals, 'blocks', pd.blocks, 'minutes', pd.minutes,
        'home_team', pd.home_team, 'away_team', pd.away_team, 'home_score', pd.home_score, 'away_score', pd.away_score,
        'game_score', round(pd.game_score, 1),
        'top_cards', (
          select coalesce(jsonb_agg(jsonb_build_object(
              'card_slug', q.card_slug, 'card_number', q.card_number, 'is_rookie', q.is_rookie,
              'set_name', q.set_name, 'season', q.season, 'parallel_name', q.parallel_name,
              'serial_run', q.serial_run, 'grade', q.grade, 'after_cents', q.after_cents,
              'change_cents', (q.after_cents - q.before_cents)
            ) order by (q.parallel_name = 'Base' and q.grade = 'RAW') desc, q.after_cents desc), '[]'::jsonb)
          from (select * from priced x where x.player_id = pd.player_id and x.after_cents is not null
                order by (x.parallel_name = 'Base' and x.grade = 'RAW') desc, x.after_cents desc limit 3) q
        )
      ) order by pd.game_score desc, pd.points desc), '[]'::jsonb) as j
    from (select * from played order by game_score desc, points desc limit p_limit) pd
    join public.players pl on pl.id = pd.player_id
  )
  select g.j, l.j, pf.j into v_gainers, v_losers, v_perf from gainers g, losers l, perf pf;

  return jsonb_build_object(
    'day', v_day,
    'is_preseason', (select (v_day < (value->>0)::date) from public.app_settings where key = 'season_start'),
    'requested_day', p_day,
    'latest_day', v_latest,
    'is_off_day', (p_day is null and v_latest < v_today - 1),
    'before_at', v_before,
    'after_at', v_after,
    'thresholds', jsonb_build_object('min_sample_size', p_min_sample, 'min_price_cents', p_min_price_cents),
    'games', v_games,
    'gainers', v_gainers,
    'losers', v_losers,
    'performances', v_perf
  );
end;
$$;

-- 90 days of the Base raw price of one card, for the public card page. One point per
-- recorded change, oldest first. No user data involved.
create or replace function public.public_price_history(p_card_slug text, p_days integer default 90)
returns table (captured_at timestamptz, price_cents integer, sample_size integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pp.captured_at, pp.price_cents, pp.sample_size
  from public.price_points pp
  join public.parallels par on par.id = pp.parallel_id
  join public.cards c on c.id = par.card_id
  where (c.public_slug = p_card_slug or c.slug = p_card_slug)
    and par.name = 'Base' and pp.grade = 'RAW'
    and pp.captured_at >= now() - make_interval(days => least(greatest(p_days, 1), 365))
  order by pp.captured_at;
$$;
grant execute on function public.public_price_history(text, integer) to anon, authenticated;
