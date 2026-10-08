-- Vault Score, phase 1 (plan: docs/plan-vault-score.md, legal: docs/legal/fantasy-game.md).
-- A daily fantasy lineup of 5 owned players plus a captain (x2), locked at the first tip-off
-- of the US Eastern day and scored from real box scores only (never card value or rarity).
--
--   * player_game_lines.turnovers, parsed by job-stats from now on, backfilled from `raw`;
--   * fantasy_scoring: configurable weights (public "How scoring works" page reads them);
--   * fantasy_seasons: NBA regular season bounds (preseason never counts);
--   * game_days: today's first tip-off (job-schedule) and the lock / score state;
--   * lineup_drafts (what the user edits, carried over day to day), lineups (frozen at the
--     lock), lineup_scores (computed by score_game_day after job-stats);
--   * lineup_events: rate limit on lineup saves (and abuse signals in phase 2).
-- Everything is gated by app_settings.vault_score.enabled (false in production until
-- Highlightly confirms derived data is allowed, see docs/legal/highlightly-terms.md).

-- ---------------------------------------------------------------------------
-- Turnovers
-- ---------------------------------------------------------------------------

alter table public.player_game_lines add column turnovers integer check (turnovers is null or turnovers >= 0);

-- Backfill from the stored Highlightly entry ({"statistics": [{"name": "Total Turnovers", ...}]}).
update public.player_game_lines l
set turnovers = sub.value
from (
  select pgl.id, (s ->> 'value')::numeric::integer as value
  from public.player_game_lines pgl
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(pgl.raw -> 'statistics') = 'array' then pgl.raw -> 'statistics' else '[]'::jsonb end
  ) as s
  where s ->> 'name' ilike '%turnover%' and (s ->> 'value') ~ '^\d+(\.\d+)?$'
) as sub
where l.id = sub.id and l.turnovers is null;

-- ---------------------------------------------------------------------------
-- Settings, scoring weights, seasons
-- ---------------------------------------------------------------------------

insert into public.app_settings (key, value, description) values
  ('season_end', '"2027-04-11"', 'Last day of the NBA regular season (official 2026-27 schedule, nba.com). Updated by hand each season.'),
  ('vault_score', '{"enabled": false, "lineup_saves_per_day": 20, "lineup_size": 5}',
   'Vault Score game. enabled=false keeps lock and scoring off (production, until Highlightly confirms derived data).')
on conflict (key) do nothing;

create table public.fantasy_scoring (
  stat text not null check (stat in ('points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers')),
  weight numeric(5, 2) not null,
  valid_from date not null,
  primary key (stat, valid_from)
);
alter table public.fantasy_scoring enable row level security;
create policy fantasy_scoring_read on public.fantasy_scoring for select using (true);

insert into public.fantasy_scoring (stat, weight, valid_from) values
  ('points', 1, '2026-01-01'),
  ('rebounds', 1.2, '2026-01-01'),
  ('assists', 1.5, '2026-01-01'),
  ('steals', 3, '2026-01-01'),
  ('blocks', 3, '2026-01-01'),
  ('turnovers', -1, '2026-01-01');

create table public.fantasy_seasons (
  id text primary key,
  label text not null,
  regular_start date not null,
  regular_end date not null,
  check (regular_end > regular_start)
);
alter table public.fantasy_seasons enable row level security;
create policy fantasy_seasons_read on public.fantasy_seasons for select using (true);

-- 2026-27 regular season: Tuesday 2026-10-20 to Sunday 2027-04-11 (nba.com key dates).
insert into public.fantasy_seasons (id, label, regular_start, regular_end)
values ('2026-27', '2026-27 season', '2026-10-20', '2027-04-11');

-- ---------------------------------------------------------------------------
-- Game days: first tip-off and lock / score state
-- ---------------------------------------------------------------------------

create table public.game_days (
  day date primary key,
  first_tip_at timestamptz,
  games integer not null default 0 check (games >= 0),
  locked_at timestamptz,
  scored_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.game_days enable row level security;
create policy game_days_read on public.game_days for select using (true);

-- ---------------------------------------------------------------------------
-- Lineups
-- ---------------------------------------------------------------------------

-- The lineup being edited. It is the user's lineup "from now on": every lock copies it.
create table public.lineup_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  player_ids uuid[] not null check (cardinality(player_ids) = 5),
  captain_id uuid not null,
  updated_at timestamptz not null default now(),
  check (captain_id = any (player_ids))
);
alter table public.lineup_drafts enable row level security;
create policy lineup_drafts_owner_read on public.lineup_drafts for select using (user_id = auth.uid());

-- Frozen at the lock. A slot is null when its player was not eligible for that day.
create table public.lineups (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_day date not null,
  player_ids uuid[] not null check (cardinality(player_ids) = 5),
  captain_id uuid,
  locked_at timestamptz not null default now(),
  primary key (user_id, game_day)
);
create index lineups_game_day_idx on public.lineups (game_day);
alter table public.lineups enable row level security;
create policy lineups_owner_read on public.lineups for select using (user_id = auth.uid());

create table public.lineup_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_day date not null,
  total numeric(7, 1) not null,
  counts boolean not null,              -- false outside the regular season (preseason, play-in, off-season)
  per_player jsonb not null,            -- [{player_id, slot, captain, played, minutes, points, rebounds, assists, steals, blocks, turnovers, fpts}]
  scored_at timestamptz not null default now(),
  primary key (user_id, game_day)
);
create index lineup_scores_game_day_idx on public.lineup_scores (game_day);
alter table public.lineup_scores enable row level security;
create policy lineup_scores_owner_read on public.lineup_scores for select using (user_id = auth.uid());

create table public.lineup_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  action text not null,
  details jsonb
);
create index lineup_events_user_at_idx on public.lineup_events (user_id, at);
alter table public.lineup_events enable row level security;
-- No policy: service role only.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.eastern_day(p_at timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  select (p_at at time zone 'America/New_York')::date;
$$;

create or replace function public.vault_score_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value ->> 'enabled')::boolean from public.app_settings where key = 'vault_score'), false);
$$;

-- True when a day is a regular-season day (scores count in standings).
create or replace function public.is_regular_season_day(p_day date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.fantasy_seasons where p_day between regular_start and regular_end
  );
$$;

-- Fantasy points of one stat line with the weights valid on p_day. Missing stats count 0.
create or replace function public.fantasy_points(
  p_day date,
  p_points integer,
  p_rebounds integer,
  p_assists integer,
  p_steals integer,
  p_blocks integer,
  p_turnovers integer
)
returns numeric
language sql
stable
set search_path = ''
as $$
  with w as (
    select distinct on (stat) stat, weight
    from public.fantasy_scoring
    where valid_from <= p_day
    order by stat, valid_from desc
  )
  select round(coalesce(sum(w.weight * case w.stat
    when 'points' then coalesce(p_points, 0)
    when 'rebounds' then coalesce(p_rebounds, 0)
    when 'assists' then coalesce(p_assists, 0)
    when 'steals' then coalesce(p_steals, 0)
    when 'blocks' then coalesce(p_blocks, 0)
    when 'turnovers' then coalesce(p_turnovers, 0)
  end), 0), 1)
  from w;
$$;

-- Players a user may field on p_day: at least one card of the player, added by the previous
-- Eastern day (a card added today counts from tomorrow).
create or replace function public.eligible_player_ids(p_user_id uuid, p_day date)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct c.player_id
  from public.collection_items ci
  join public.parallels pa on pa.id = ci.parallel_id
  join public.cards c on c.id = pa.card_id
  where ci.user_id = p_user_id
    and public.eastern_day(ci.created_at) < p_day;
$$;
revoke execute on function public.eligible_player_ids from public, anon, authenticated;

-- The next game day whose lineup is not locked yet (today if today's lock is still ahead).
-- Without a known schedule, today's Eastern day (or tomorrow once today is locked).
create or replace function public.next_lineup_day()
returns date
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select min(day) from public.game_days
      where day >= public.eastern_day() and locked_at is null and games > 0),
    case when exists (select 1 from public.game_days where day = public.eastern_day() and locked_at is not null)
      then public.eastern_day() + 1
      else public.eastern_day()
    end
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: save the lineup (always the draft; applies from the next lock)
-- ---------------------------------------------------------------------------

create or replace function public.set_lineup(p_player_ids uuid[], p_captain_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_max integer;
  v_saves integer;
  v_day date := public.next_lineup_day();
  v_owned uuid[];
  v_eligible uuid[];
  v_pending uuid[];
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_player_ids is null or cardinality(p_player_ids) <> 5 then
    raise exception 'LINEUP_INVALID:size';
  end if;
  if (select count(distinct x) from unnest(p_player_ids) as x where x is not null) <> 5 then
    raise exception 'LINEUP_INVALID:duplicate';
  end if;
  if p_captain_id is null or not (p_captain_id = any (p_player_ids)) then
    raise exception 'LINEUP_INVALID:captain';
  end if;

  -- Ownership: at least one card of each player, whatever the date.
  select array_agg(distinct c.player_id) into v_owned
  from public.collection_items ci
  join public.parallels pa on pa.id = ci.parallel_id
  join public.cards c on c.id = pa.card_id
  where ci.user_id = v_uid and c.player_id = any (p_player_ids);
  if coalesce(cardinality(v_owned), 0) <> 5 then
    raise exception 'LINEUP_INVALID:not_owned';
  end if;

  -- Rate limit per Eastern day.
  select coalesce((value ->> 'lineup_saves_per_day')::integer, 20) into v_max
  from public.app_settings where key = 'vault_score';
  select count(*) into v_saves from public.lineup_events
  where user_id = v_uid and action = 'save' and public.eastern_day(at) = public.eastern_day();
  if v_saves >= coalesce(v_max, 20) then
    raise exception 'RATE_LIMITED:lineup';
  end if;

  insert into public.lineup_drafts (user_id, player_ids, captain_id, updated_at)
  values (v_uid, p_player_ids, p_captain_id, now())
  on conflict (user_id) do update
    set player_ids = excluded.player_ids, captain_id = excluded.captain_id, updated_at = now();

  insert into public.lineup_events (user_id, action, details)
  values (v_uid, 'save', jsonb_build_object('players', p_player_ids, 'captain', p_captain_id, 'day', v_day));

  select array_agg(e) into v_eligible
  from public.eligible_player_ids(v_uid, v_day) as e where e = any (p_player_ids);
  select array_agg(p) into v_pending
  from unnest(p_player_ids) as p where not (p = any (coalesce(v_eligible, '{}')));

  return jsonb_build_object(
    'applies_to', v_day,
    'pending_player_ids', coalesce(to_jsonb(v_pending), '[]'::jsonb),
    'saves_left', greatest(coalesce(v_max, 20) - v_saves - 1, 0)
  );
end;
$$;
revoke execute on function public.set_lineup from public, anon;
grant execute on function public.set_lineup to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: everything the lineup screen needs in one call
-- ---------------------------------------------------------------------------

create or replace function public.my_lineup()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.eastern_day();
  v_next date := public.next_lineup_day();
  v_max integer;
  v_saves integer;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select coalesce((value ->> 'lineup_saves_per_day')::integer, 20) into v_max
  from public.app_settings where key = 'vault_score';
  select count(*) into v_saves from public.lineup_events
  where user_id = v_uid and action = 'save' and public.eastern_day(at) = v_today;

  return jsonb_build_object(
    'enabled', public.vault_score_enabled(),
    'today', v_today,
    'next_day', v_next,
    'next_lock_at', (select first_tip_at from public.game_days where day = v_next),
    'next_games', coalesce((select games from public.game_days where day = v_next), 0),
    'today_locked', exists (select 1 from public.game_days where day = v_today and locked_at is not null),
    'counts', public.is_regular_season_day(v_next),
    'saves_left', greatest(coalesce(v_max, 20) - v_saves, 0),
    'draft', (
      select jsonb_build_object('player_ids', d.player_ids, 'captain_id', d.captain_id, 'updated_at', d.updated_at)
      from public.lineup_drafts d where d.user_id = v_uid
    ),
    'locked', (
      select jsonb_build_object('game_day', l.game_day, 'player_ids', l.player_ids, 'captain_id', l.captain_id, 'locked_at', l.locked_at)
      from public.lineups l where l.user_id = v_uid order by l.game_day desc limit 1
    ),
    -- Owned players with their eligibility for the next lock and their last 5 fantasy scores.
    'roster', coalesce((
      select jsonb_agg(r order by r.avg_fpts desc nulls last, r.name)
      from (
        select
          p.id as player_id,
          p.name,
          p.slug,
          p.team,
          bool_or(c.is_rookie) as is_rookie,
          (p.id in (select public.eligible_player_ids(v_uid, v_next))) as eligible,
          (
            select round(avg(f.fpts), 1) from (
              select public.fantasy_points(g.game_day, l.points, l.rebounds, l.assists, l.steals, l.blocks, l.turnovers) as fpts
              from public.player_game_lines l
              join public.games g on g.id = l.game_id
              where l.player_id = p.id and coalesce(l.minutes, 0) > 0
              order by g.game_day desc limit 5
            ) f
          ) as avg_fpts,
          -- One owned card to draw the foil frame: the rarest parallel the user owns.
          (
            select jsonb_build_object('parallel', pa2.name, 'serial_run', pa2.serial_run, 'set', s2.name, 'number', c2.number)
            from public.collection_items ci2
            join public.parallels pa2 on pa2.id = ci2.parallel_id
            join public.cards c2 on c2.id = pa2.card_id
            join public.card_sets s2 on s2.id = c2.set_id
            where ci2.user_id = v_uid and c2.player_id = p.id
            order by pa2.serial_run nulls last, ci2.created_at
            limit 1
          ) as card
        from public.collection_items ci
        join public.parallels pa on pa.id = ci.parallel_id
        join public.cards c on c.id = pa.card_id
        join public.players p on p.id = c.player_id
        where ci.user_id = v_uid
        group by p.id
      ) r
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.my_lineup from public, anon;
grant execute on function public.my_lineup to authenticated;

-- ---------------------------------------------------------------------------
-- Schedule (job-schedule) and lock (pg_cron every 5 minutes)
-- ---------------------------------------------------------------------------

create or replace function public.record_schedule(p_day date, p_first_tip_at timestamptz, p_games integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.game_days (day, first_tip_at, games, updated_at)
  values (p_day, p_first_tip_at, p_games, now())
  on conflict (day) do update
    set first_tip_at = case when public.game_days.locked_at is null then excluded.first_tip_at else public.game_days.first_tip_at end,
        games = excluded.games,
        updated_at = now();
$$;
revoke execute on function public.record_schedule from public, anon, authenticated;

-- Copies every draft into lineups for each due day. Ineligible players leave an empty slot;
-- a captain who is not eligible leaves the lineup without captain. Idempotent.
create or replace function public.lock_due_game_days()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day record;
  v_count integer := 0;
begin
  if not public.vault_score_enabled() then
    return 0;
  end if;
  for v_day in
    select day from public.game_days
    where locked_at is null and games > 0 and first_tip_at is not null and first_tip_at <= now()
    order by day
    for update skip locked
  loop
    insert into public.lineups (user_id, game_day, player_ids, captain_id, locked_at)
    select
      d.user_id,
      v_day.day,
      array(
        select case when p = any (e.ids) then p else null end
        from unnest(d.player_ids) with ordinality as u(p, ord)
        order by ord
      ),
      case when d.captain_id = any (e.ids) then d.captain_id else null end,
      now()
    from public.lineup_drafts d
    cross join lateral (
      select coalesce(array_agg(x), '{}') as ids from public.eligible_player_ids(d.user_id, v_day.day) as x
    ) e
    on conflict (user_id, game_day) do nothing;

    update public.game_days set locked_at = now(), updated_at = now() where day = v_day.day;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.lock_due_game_days from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Scoring (called by job-stats once last night's box scores are stored). Idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.score_game_day(p_day date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.vault_score_enabled() then
    return 0;
  end if;

  with slots as (
    select l.user_id, u.p as player_id, u.ord as slot, (u.p = l.captain_id) as captain
    from public.lineups l
    cross join lateral unnest(l.player_ids) with ordinality as u(p, ord)
    where l.game_day = p_day
  ),
  lines as (
    select pgl.player_id,
      sum(pgl.minutes) as minutes, sum(pgl.points) as points, sum(pgl.rebounds) as rebounds,
      sum(pgl.assists) as assists, sum(pgl.steals) as steals, sum(pgl.blocks) as blocks,
      sum(pgl.turnovers) as turnovers
    from public.player_game_lines pgl
    join public.games g on g.id = pgl.game_id
    where g.game_day = p_day and g.status = 'final'
    group by pgl.player_id
  ),
  scored as (
    select s.user_id, s.slot, s.player_id, s.captain,
      (li.player_id is not null and coalesce(li.minutes, 0) > 0) as played,
      li.minutes, li.points, li.rebounds, li.assists, li.steals, li.blocks, li.turnovers,
      case when li.player_id is not null and coalesce(li.minutes, 0) > 0
        then public.fantasy_points(p_day, li.points::integer, li.rebounds::integer, li.assists::integer,
                                   li.steals::integer, li.blocks::integer, li.turnovers::integer)
        else 0 end as base
    from slots s
    left join lines li on li.player_id = s.player_id
  )
  insert into public.lineup_scores (user_id, game_day, total, counts, per_player, scored_at)
  select user_id, p_day,
    sum(case when captain then base * 2 else base end),
    public.is_regular_season_day(p_day),
    jsonb_agg(jsonb_build_object(
      'slot', slot, 'player_id', player_id, 'captain', captain, 'played', played,
      'minutes', minutes, 'points', points, 'rebounds', rebounds, 'assists', assists,
      'steals', steals, 'blocks', blocks, 'turnovers', turnovers,
      'fpts', case when captain then base * 2 else base end
    ) order by slot),
    now()
  from scored
  group by user_id
  on conflict (user_id, game_day) do update
    set total = excluded.total, counts = excluded.counts, per_player = excluded.per_player, scored_at = now();
  get diagnostics v_count = row_count;

  update public.game_days set scored_at = now(), updated_at = now() where day = p_day;
  return v_count;
end;
$$;
revoke execute on function public.score_game_day from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schedules (UTC; job-schedule gates on 6 AM Eastern like the other jobs)
-- ---------------------------------------------------------------------------

select cron.schedule('job-schedule', '0 10,11 * * *', $$select public.invoke_job('job-schedule')$$);
select cron.schedule('lock-lineups', '*/5 * * * *', $$select public.lock_due_game_days()$$);
