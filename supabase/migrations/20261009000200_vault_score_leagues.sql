-- Vault Score, phase 2: usernames, global ranking opt-out, private leagues, standings,
-- rank movement and streaks, badges (the only reward), abuse flags for Martin's review.
-- Free: global ranking + 1 private league, current week and season. Premium: unlimited
-- leagues, past weeks, full history and per-player details. Points are identical for all.

-- ---------------------------------------------------------------------------
-- Usernames (public identity in rankings; the email is never shown)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column username text check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  add column username_changed_at timestamptz,
  add column ranking_opt_out boolean not null default false;
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- Profanity and impersonation filter. `token` words must equal a whole token (split on
-- underscores and digits) so "classic" is not caught by "ass"; `substring` words are long
-- enough to be searched anywhere.
create table public.blocked_words (
  word text primary key check (word = lower(word)),
  match text not null default 'substring' check (match in ('substring', 'token'))
);
alter table public.blocked_words enable row level security;
-- No policy: service role only.

insert into public.blocked_words (word, match) values
  -- impersonation and official-sounding names
  ('admin', 'substring'), ('moderator', 'substring'), ('hoopticker', 'substring'), ('support', 'token'),
  ('official', 'substring'), ('staff', 'token'), ('nba', 'token'), ('nbpa', 'substring'),
  ('topps', 'substring'), ('fanatics', 'substring'), ('root', 'token'), ('system', 'token'),
  -- profanity
  ('fuck', 'substring'), ('shit', 'substring'), ('bitch', 'substring'), ('cunt', 'substring'),
  ('dick', 'substring'), ('pussy', 'substring'), ('whore', 'substring'), ('slut', 'substring'),
  ('bastard', 'substring'), ('asshole', 'substring'), ('cock', 'token'), ('ass', 'token'),
  ('porn', 'substring'), ('penis', 'substring'), ('vagina', 'substring'), ('boob', 'substring'),
  ('wank', 'substring'), ('jizz', 'substring'), ('cum', 'token'), ('sex', 'token'), ('anal', 'token'),
  ('rape', 'token'), ('nazi', 'substring'), ('hitler', 'substring'), ('kkk', 'substring'),
  -- slurs
  ('nigg', 'substring'), ('nigga', 'substring'), ('fag', 'substring'), ('retard', 'substring'),
  ('spic', 'token'), ('chink', 'substring'), ('kike', 'substring'), ('tranny', 'substring'),
  ('coon', 'token'), ('wetback', 'substring'), ('gook', 'substring'), ('dyke', 'substring'),
  -- French (the founder's language; common in usernames)
  ('merde', 'substring'), ('putain', 'substring'), ('connard', 'substring'), ('salope', 'substring'),
  ('encule', 'substring'), ('pute', 'token'), ('batard', 'substring');

-- Lowercase and leetspeak folded (0->o, 1->i, 3->e, 4->a, 5->s, 7->t, @->a, $->s).
create or replace function public.normalize_name_for_filter(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(lower(coalesce(p_text, '')), '013457@$!|', 'oieastasii');
$$;

-- A name is checked in three forms: as typed, leet-folded, and leet-folded with repeated
-- letters collapsed ("FUUUCK"). Blocked words are compared as written: `substring` words
-- (3+ letters) anywhere in the letters-only forms, `token` words against whole tokens.
create or replace function public.is_name_allowed(p_text text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with forms as (
    select lower(coalesce(p_text, '')) as f
    union select public.normalize_name_for_filter(p_text)
    union select regexp_replace(public.normalize_name_for_filter(p_text), '(.)\1+', '\1', 'g')
  ),
  letters as (
    select regexp_replace(f, '[^a-z]', '', 'g') as l from forms
  ),
  tokens as (
    select t from forms, regexp_split_to_table(f, '[^a-z]+') as t where t <> ''
  )
  select not exists (
    select 1 from public.blocked_words b
    where (b.match = 'substring' and char_length(b.word) >= 3
           and exists (select 1 from letters where strpos(letters.l, b.word) > 0))
       or (b.match = 'token' and exists (select 1 from tokens where tokens.t = b.word))
  );
$$;
revoke execute on function public.is_name_allowed from public, anon;
grant execute on function public.is_name_allowed to authenticated;

create or replace function public.set_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(p_username);
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if v_name is null or v_name !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'USERNAME_INVALID:format';
  end if;
  if not public.is_name_allowed(v_name) then
    raise exception 'USERNAME_INVALID:blocked';
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_name) and id <> v_uid) then
    raise exception 'USERNAME_TAKEN';
  end if;
  update public.profiles set username = v_name, username_changed_at = now() where id = v_uid;
  return v_name;
end;
$$;
revoke execute on function public.set_username from public, anon;
grant execute on function public.set_username to authenticated;

create or replace function public.set_ranking_opt_out(p_opt_out boolean)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.profiles set ranking_opt_out = coalesce(p_opt_out, false) where id = auth.uid()
  returning ranking_opt_out;
$$;
revoke execute on function public.set_ranking_opt_out from public, anon;
grant execute on function public.set_ranking_opt_out to authenticated;

-- ---------------------------------------------------------------------------
-- Private leagues
-- ---------------------------------------------------------------------------

insert into public.plan_limits (key, free_value, premium_value, description)
values ('private_leagues', 1, null, 'Private Vault Score leagues a user belongs to (owned or joined)')
on conflict (key) do nothing;

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 40),
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);
alter table public.leagues enable row level security;

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  joined_day date not null default public.eastern_day(),
  primary key (league_id, user_id)
);
create index league_members_user_id_idx on public.league_members (user_id);
alter table public.league_members enable row level security;

create trigger league_members_limit
before insert on public.league_members
for each row execute function public.enforce_plan_limit('private_leagues');

create or replace function public.is_league_member(p_league_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.league_members where league_id = p_league_id and user_id = p_user_id);
$$;

create policy leagues_member_read on public.leagues for select using (public.is_league_member(id));
create policy league_members_member_read on public.league_members for select using (public.is_league_member(league_id));
-- Writes go through the RPCs below only.

-- Unambiguous alphabet (no 0/O, 1/I).
create or replace function public.new_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
  from generate_series(1, 8);
$$;

-- When the owner leaves or deletes the account: the earliest member becomes owner; an empty
-- league is deleted.
create or replace function public.league_members_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.league_members where league_id = old.league_id) then
    delete from public.leagues where id = old.league_id;
  elsif not exists (select 1 from public.league_members where league_id = old.league_id and role = 'owner') then
    update public.league_members set role = 'owner'
    where (league_id, user_id) = (
      select league_id, user_id from public.league_members where league_id = old.league_id order by joined_at, joined_day, user_id limit 1
    );
  end if;
  return null;
end;
$$;
create trigger league_members_after_delete
after delete on public.league_members
for each row execute function public.league_members_after_delete();

create or replace function public.create_league(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(p_name);
  v_id uuid;
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if v_name is null or char_length(v_name) not between 3 and 40 then
    raise exception 'LEAGUE_INVALID:name';
  end if;
  if not public.is_name_allowed(v_name) then
    raise exception 'LEAGUE_INVALID:blocked';
  end if;
  loop
    v_code := public.new_invite_code();
    exit when not exists (select 1 from public.leagues where invite_code = v_code);
  end loop;
  insert into public.leagues (name, invite_code) values (v_name, v_code) returning id into v_id;
  insert into public.league_members (league_id, user_id, role) values (v_id, v_uid, 'owner');
  return jsonb_build_object('id', v_id, 'name', v_name, 'invite_code', v_code);
end;
$$;

create or replace function public.join_league(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_league public.leagues;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select * into v_league from public.leagues where invite_code = upper(btrim(p_invite_code));
  if not found then
    raise exception 'LEAGUE_NOT_FOUND';
  end if;
  if not public.is_league_member(v_league.id, v_uid) then
    if (select count(*) from public.league_members where league_id = v_league.id) >= 50 then
      raise exception 'LEAGUE_FULL';
    end if;
    insert into public.league_members (league_id, user_id) values (v_league.id, v_uid);
    insert into public.lineup_events (user_id, action, details)
    values (v_uid, 'league_join', jsonb_build_object('league_id', v_league.id));
  end if;
  return jsonb_build_object('id', v_league.id, 'name', v_league.name);
end;
$$;

create or replace function public.leave_league(p_league_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.league_members where league_id = p_league_id and user_id = auth.uid();
$$;

create or replace function public.remove_league_member(p_league_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'LEAGUE_FORBIDDEN';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'LEAGUE_FORBIDDEN';
  end if;
  delete from public.league_members where league_id = p_league_id and user_id = p_user_id;
end;
$$;

create or replace function public.regenerate_league_code(p_league_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'LEAGUE_FORBIDDEN';
  end if;
  loop
    v_code := public.new_invite_code();
    exit when not exists (select 1 from public.leagues where invite_code = v_code);
  end loop;
  update public.leagues set invite_code = v_code where id = p_league_id;
  return v_code;
end;
$$;

revoke execute on function public.create_league, public.join_league, public.leave_league,
  public.remove_league_member, public.regenerate_league_code from public, anon;
grant execute on function public.create_league, public.join_league, public.leave_league,
  public.remove_league_member, public.regenerate_league_code to authenticated;
revoke execute on function public.new_invite_code from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Periods, standings, snapshots
-- ---------------------------------------------------------------------------

-- Weeks run Monday to Sunday, Eastern. Key 'YYYY-MM-DD' of the Monday.
create or replace function public.week_start(p_day date)
returns date
language sql
immutable
set search_path = ''
as $$
  select (p_day - (extract(isodow from p_day)::integer - 1));
$$;

-- Current season id: the season containing today, else the next one, else the last one.
create or replace function public.current_season_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select id from public.fantasy_seasons where public.eastern_day() between regular_start and regular_end),
    (select id from public.fantasy_seasons where regular_start > public.eastern_day() order by regular_start limit 1),
    (select id from public.fantasy_seasons order by regular_end desc limit 1)
  );
$$;

-- Points per user for a period and scope. Global = users with a username who did not opt
-- out. League = members, counting days from their joined_day.
create or replace function public.standings_rows(
  p_scope text,           -- 'global' | 'league'
  p_league_id uuid,
  p_period text,          -- 'week' | 'season'
  p_key text,             -- week: Monday 'YYYY-MM-DD'; season: fantasy_seasons.id
  p_until date default null  -- snapshots: only days up to this one
)
returns table (user_id uuid, points numeric, days integer, rank bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select
      case when p_period = 'week' then p_key::date else s.regular_start end as from_day,
      case when p_period = 'week' then p_key::date + 6 else s.regular_end end as to_day
    from (select 1) one
    left join public.fantasy_seasons s on p_period = 'season' and s.id = p_key
  ),
  members as (
    select p.id as user_id, null::date as since
    from public.profiles p
    where p_scope = 'global' and p.username is not null and not p.ranking_opt_out
    union all
    select m.user_id, m.joined_day
    from public.league_members m
    where p_scope = 'league' and m.league_id = p_league_id
  ),
  totals as (
    select m.user_id, coalesce(sum(ls.total), 0) as points, count(ls.game_day)::integer as days
    from members m
    cross join bounds b
    left join public.lineup_scores ls
      on ls.user_id = m.user_id and ls.counts
     and ls.game_day between b.from_day and least(b.to_day, coalesce(p_until, b.to_day))
     and (m.since is null or ls.game_day >= m.since)
    group by m.user_id
  )
  select t.user_id, t.points, t.days, rank() over (order by t.points desc)
  from totals t
  where p_scope = 'league' or t.days > 0;
$$;
revoke execute on function public.standings_rows from public, anon, authenticated;

create table public.standings_snapshots (
  day date not null,
  scope text not null check (scope in ('global', 'league')),
  scope_id uuid not null default '00000000-0000-0000-0000-000000000000',
  period text not null check (period in ('week', 'season')),
  period_key text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  rank integer not null,
  points numeric(9, 1) not null,
  primary key (day, scope, scope_id, period, user_id)
);
create index standings_snapshots_user_idx on public.standings_snapshots (user_id, scope, period, day);
alter table public.standings_snapshots enable row level security;
-- No policy: read through standings() only.

create or replace function public.refresh_standings(p_day date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week text := public.week_start(p_day)::text;
  v_season text := (select id from public.fantasy_seasons where p_day between regular_start and regular_end);
  v_count integer := 0;
  v_n integer;
  v_league uuid;
begin
  if v_season is null then
    return 0; -- preseason and off-season days never enter the standings
  end if;
  delete from public.standings_snapshots where day = p_day;

  insert into public.standings_snapshots (day, scope, period, period_key, user_id, rank, points)
  select p_day, 'global', 'week', v_week, user_id, rank, points from public.standings_rows('global', null, 'week', v_week, p_day)
  union all
  select p_day, 'global', 'season', v_season, user_id, rank, points from public.standings_rows('global', null, 'season', v_season, p_day);
  get diagnostics v_n = row_count;
  v_count := v_count + v_n;

  for v_league in select id from public.leagues loop
    insert into public.standings_snapshots (day, scope, scope_id, period, period_key, user_id, rank, points)
    select p_day, 'league', v_league, 'week', v_week, user_id, rank, points from public.standings_rows('league', v_league, 'week', v_week, p_day)
    union all
    select p_day, 'league', v_league, 'season', v_season, user_id, rank, points from public.standings_rows('league', v_league, 'season', v_season, p_day);
    get diagnostics v_n = row_count;
    v_count := v_count + v_n;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.refresh_standings from public, anon, authenticated;

-- Consecutive scored game days with a lineup that scored, ending at the latest scored day.
create or replace function public.scoring_streak(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select gd.day, (ls.total is not null and ls.total > 0) as hit,
      row_number() over (order by gd.day desc) as n
    from public.game_days gd
    left join public.lineup_scores ls on ls.game_day = gd.day and ls.user_id = p_user_id
    where gd.scored_at is not null
  )
  select coalesce(min(n) - 1, (select count(*) from days))::integer
  from days where not hit;
$$;
revoke execute on function public.scoring_streak from public, anon, authenticated;

-- One call for a leaderboard: rows with username, movement (vs the previous snapshot) and
-- streak; the caller's row pinned. Past periods are Premium (LIMIT_REACHED:history).
create or replace function public.standings(
  p_scope text default 'global',
  p_league_id uuid default null,
  p_period text default 'week',
  p_key text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_current_week text := public.week_start(public.eastern_day())::text;
  v_current_season text := public.current_season_id();
  v_key text;
  v_default_key text;
  v_scope_id uuid;
  v_rows jsonb;
  v_me jsonb;
  v_prev_day date;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_scope not in ('global', 'league') or p_period not in ('week', 'season') then
    raise exception 'STANDINGS_INVALID';
  end if;
  if p_scope = 'league' and not public.is_league_member(p_league_id, v_uid) then
    raise exception 'LEAGUE_FORBIDDEN';
  end if;
  if p_period = 'week' then
    v_default_key := v_current_week;
  else
    v_default_key := v_current_season;
  end if;
  v_key := coalesce(p_key, v_default_key);
  if v_key <> v_default_key and not public.is_premium(v_uid) then
    raise exception 'LIMIT_REACHED:history';
  end if;
  v_scope_id := coalesce(p_league_id, '00000000-0000-0000-0000-000000000000');
  if p_scope = 'global' then
    v_scope_id := '00000000-0000-0000-0000-000000000000';
  end if;

  -- Movement compares with the snapshot before the latest one of this period.
  select max(day) into v_prev_day from public.standings_snapshots
  where scope = p_scope and scope_id = v_scope_id and period = p_period and period_key = v_key
    and day < (select max(day) from public.standings_snapshots
               where scope = p_scope and scope_id = v_scope_id and period = p_period and period_key = v_key);

  with r as (
    select s.user_id, s.points, s.days, s.rank, p.username,
      (select prev.rank from public.standings_snapshots prev
        where prev.day = v_prev_day and prev.scope = p_scope and prev.scope_id = v_scope_id
          and prev.period = p_period and prev.user_id = s.user_id) as prev_rank
    from public.standings_rows(p_scope, p_league_id, p_period, v_key) s
    join public.profiles p on p.id = s.user_id
  ),
  shaped as (
    select jsonb_build_object(
      'rank', r.rank,
      'username', coalesce(r.username, 'Player'),
      'points', r.points,
      'days', r.days,
      'movement', case when r.prev_rank is null then null else r.prev_rank - r.rank end,
      'streak', public.scoring_streak(r.user_id),
      'is_me', r.user_id = v_uid
    ) as entry, r.rank, r.user_id
    from r
  )
  select
    coalesce((select jsonb_agg(t.entry order by t.rank, t.entry ->> 'username') from (select * from shaped order by rank limit p_limit) t), '[]'::jsonb),
    (select entry from shaped where user_id = v_uid)
  into v_rows, v_me;

  return jsonb_build_object(
    'scope', p_scope,
    'league_id', p_league_id,
    'period', p_period,
    'key', v_key,
    'current_week', v_current_week,
    'current_season', v_current_season,
    'rows', v_rows,
    'me', v_me,
    'total', (select count(*) from public.standings_rows(p_scope, p_league_id, p_period, v_key))
  );
end;
$$;
revoke execute on function public.standings from public, anon;
grant execute on function public.standings to authenticated;

-- ---------------------------------------------------------------------------
-- My scores (history and recap). Free: last 7 game days, details for the latest only.
-- ---------------------------------------------------------------------------

create or replace function public.my_scores(p_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  v_limit integer;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  v_premium := public.is_premium(v_uid);
  v_limit := case when v_premium then greatest(coalesce(p_limit, 30), 1) else least(coalesce(p_limit, 7), 7) end;
  return jsonb_build_object(
    'premium', v_premium,
    'limited', not v_premium,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'game_day', d.game_day,
        'total', d.total,
        'counts', d.counts,
        'per_player', case when v_premium or d.n = 1 then d.per_player else null end
      ) order by d.game_day desc)
      from (
        select ls.*, row_number() over (order by ls.game_day desc) as n
        from public.lineup_scores ls where ls.user_id = v_uid
        order by ls.game_day desc limit v_limit
      ) d
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.my_scores from public, anon;
grant execute on function public.my_scores to authenticated;

-- ---------------------------------------------------------------------------
-- Leagues: list and page
-- ---------------------------------------------------------------------------

create or replace function public.my_leagues()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'name', l.name, 'role', m.role,
    'members', (select count(*) from public.league_members x where x.league_id = l.id),
    'my_rank', (select s.rank from public.standings_rows('league', l.id, 'week', public.week_start(public.eastern_day())::text) s where s.user_id = auth.uid())
  ) order by m.joined_at), '[]'::jsonb)
  from public.league_members m
  join public.leagues l on l.id = m.league_id
  where m.user_id = auth.uid();
$$;
revoke execute on function public.my_leagues from public, anon;
grant execute on function public.my_leagues to authenticated;

create or replace function public.league_page(p_league_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_last date;
begin
  if not public.is_league_member(p_league_id, v_uid) then
    raise exception 'LEAGUE_FORBIDDEN';
  end if;
  select max(day) into v_last from public.game_days where scored_at is not null;
  return (
    select jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'invite_code', l.invite_code,
      'created_at', l.created_at,
      'my_role', (select role from public.league_members where league_id = l.id and user_id = v_uid),
      'last_day', v_last,
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'username', coalesce(p.username, 'Player'),
          'role', m.role,
          'joined_day', m.joined_day,
          'is_me', m.user_id = v_uid,
          'last_total', ls.total,
          'last_captain', (select pl.name from public.lineups lu join public.players pl on pl.id = lu.captain_id
                            where lu.user_id = m.user_id and lu.game_day = v_last)
        ) order by ls.total desc nulls last, m.joined_at)
        from public.league_members m
        join public.profiles p on p.id = m.user_id
        left join public.lineup_scores ls on ls.user_id = m.user_id and ls.game_day = v_last
        where m.league_id = l.id
      ), '[]'::jsonb)
    )
    from public.leagues l where l.id = p_league_id
  );
end;
$$;
revoke execute on function public.league_page from public, anon;
grant execute on function public.league_page to authenticated;

-- ---------------------------------------------------------------------------
-- Badges (the only reward)
-- ---------------------------------------------------------------------------

create table public.badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('weekly_winner', 'perfect_captain', 'club_200', 'iron_five')),
  scope text not null default 'global' check (scope in ('global', 'league')),
  scope_id uuid not null default '00000000-0000-0000-0000-000000000000',
  period_key text not null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, kind, scope, scope_id, period_key)
);
alter table public.badges enable row level security;
create policy badges_owner_read on public.badges for select using (user_id = auth.uid());

create or replace function public.award_badges(p_day date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_n integer;
  v_week date;
  v_league uuid;
begin
  if not public.is_regular_season_day(p_day) then
    return 0;
  end if;

  -- Daily: perfect captain (the captain was the lineup's top scorer, everyone played).
  insert into public.badges (user_id, kind, period_key)
  select ls.user_id, 'perfect_captain', p_day::text
  from public.lineup_scores ls
  where ls.game_day = p_day
    and (select bool_and((e ->> 'played')::boolean) from jsonb_array_elements(ls.per_player) e)
    and exists (
      select 1 from jsonb_array_elements(ls.per_player) c
      where (c ->> 'captain')::boolean
        and (c ->> 'fpts')::numeric / 2 >= (select max((e ->> 'fpts')::numeric) from jsonb_array_elements(ls.per_player) e where not (e ->> 'captain')::boolean)
    )
  on conflict do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- Daily: 200 club.
  insert into public.badges (user_id, kind, period_key)
  select user_id, 'club_200', p_day::text from public.lineup_scores where game_day = p_day and total >= 200
  on conflict do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- Weekly, once the week is over: on its Sunday, and the previous week on any later day
  -- (covers a Sunday without games). Idempotent.
  foreach v_week in array array[
    case when extract(isodow from p_day) = 7 then public.week_start(p_day) end,
    public.week_start(p_day) - 7
  ] loop
    continue when v_week is null or not public.is_regular_season_day(v_week + 6) and not public.is_regular_season_day(v_week);

    insert into public.badges (user_id, kind, period_key)
    select user_id, 'weekly_winner', v_week::text
    from public.standings_rows('global', null, 'week', v_week::text) where rank = 1 and points > 0
    on conflict do nothing;
    get diagnostics v_n = row_count; v_count := v_count + v_n;

    for v_league in select id from public.leagues loop
      insert into public.badges (user_id, kind, scope, scope_id, period_key)
      select user_id, 'weekly_winner', 'league', v_league, v_week::text
      from public.standings_rows('league', v_league, 'week', v_week::text) where rank = 1 and points > 0
      on conflict do nothing;
      get diagnostics v_n = row_count; v_count := v_count + v_n;
    end loop;

    -- Iron five: all five played on every scored day of the week (3 days at least).
    insert into public.badges (user_id, kind, period_key)
    select ls.user_id, 'iron_five', v_week::text
    from public.lineup_scores ls
    where ls.game_day between v_week and v_week + 6 and ls.counts
    group by ls.user_id
    having count(*) >= 3
       and bool_and((select bool_and((e ->> 'played')::boolean) from jsonb_array_elements(ls.per_player) e))
    on conflict do nothing;
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.award_badges from public, anon, authenticated;

create or replace function public.my_badges()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', b.kind, 'scope', b.scope, 'period_key', b.period_key, 'awarded_at', b.awarded_at,
    'league', (select name from public.leagues where id = b.scope_id)
  ) order by b.awarded_at desc), '[]'::jsonb)
  from public.badges b where b.user_id = auth.uid();
$$;
revoke execute on function public.my_badges from public, anon;
grant execute on function public.my_badges to authenticated;

-- ---------------------------------------------------------------------------
-- Abuse flags (Martin reviews them; nothing is automatic)
-- ---------------------------------------------------------------------------

create table public.abuse_flags (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('card_churn', 'save_limit_streak', 'league_ring')),
  day date not null,
  details jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id, reason, day)
);
alter table public.abuse_flags enable row level security;
-- No policy: service role only.

-- Card removals are logged (with the card's age) to spot add-then-remove patterns.
create or replace function public.log_card_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- During an account deletion the user row is already gone (cascade): nothing to log.
  if exists (select 1 from auth.users where id = old.user_id) then
    insert into public.lineup_events (user_id, action, details)
    values (old.user_id, 'card_removed', jsonb_build_object('parallel_id', old.parallel_id, 'age_hours',
      round(extract(epoch from (now() - old.created_at)) / 3600)));
  end if;
  return null;
end;
$$;
create trigger collection_items_log_removal
after delete on public.collection_items
for each row execute function public.log_card_removal();

create or replace function public.flag_abuse(p_day date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_n integer;
  v_max integer := coalesce((select (value ->> 'lineup_saves_per_day')::integer from public.app_settings where key = 'vault_score'), 20);
begin
  -- 10+ cards removed within 48 h of being added, over the last 7 days.
  insert into public.abuse_flags (user_id, reason, day, details)
  select user_id, 'card_churn', p_day, jsonb_build_object('removed', count(*))
  from public.lineup_events
  where action = 'card_removed' and (details ->> 'age_hours')::numeric <= 48 and at >= now() - interval '7 days'
  group by user_id having count(*) >= 10
  on conflict do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- Saves at the daily cap on 3+ days of the last 7.
  insert into public.abuse_flags (user_id, reason, day, details)
  select user_id, 'save_limit_streak', p_day, jsonb_build_object('days', count(*))
  from (
    select user_id, public.eastern_day(at) as d from public.lineup_events
    where action = 'save' and at >= now() - interval '7 days'
    group by user_id, public.eastern_day(at) having count(*) >= v_max
  ) capped
  group by user_id having count(*) >= 3
  on conflict do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- 3+ accounts created within 10 minutes of each other joining the same league.
  insert into public.abuse_flags (user_id, reason, day, details)
  select distinct m.user_id, 'league_ring', p_day, jsonb_build_object('league_id', m.league_id)
  from public.league_members m
  join auth.users u on u.id = m.user_id
  where m.joined_at >= now() - interval '7 days'
    and (
      select count(*) from public.league_members m2 join auth.users u2 on u2.id = m2.user_id
      where m2.league_id = m.league_id and abs(extract(epoch from (u2.created_at - u.created_at))) <= 600
    ) >= 3
  on conflict do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;
  return v_count;
end;
$$;
revoke execute on function public.flag_abuse from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- After scoring: standings, badges, flags (score_game_day now calls this)
-- ---------------------------------------------------------------------------

create or replace function public.after_scoring(p_day date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshots integer;
  v_badges integer;
  v_flags integer;
begin
  v_snapshots := public.refresh_standings(p_day);
  v_badges := public.award_badges(p_day);
  v_flags := public.flag_abuse(p_day);
  return jsonb_build_object('snapshots', v_snapshots, 'badges', v_badges, 'flags', v_flags);
end;
$$;
revoke execute on function public.after_scoring from public, anon, authenticated;
