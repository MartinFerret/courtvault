-- Website <-> web app bridge (docs/plan-web-app-bridge.md): first-touch attribution (UTMs,
-- referral code) kept through sign-up, referral codes (attribution only, no reward yet),
-- public league invite info for the website landing, and shares (frozen snapshots of a
-- lineup score, a league rank or the best cards, readable by anyone with the code).

-- ---------------------------------------------------------------------------
-- Attribution and referral codes
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column acquisition jsonb,
  add column referral_code text unique check (referral_code ~ '^[A-Z2-9]{8}$'),
  add column referred_by uuid references auth.users (id) on delete set null;
-- No column grant: users write these through the RPCs below only.

-- Copies the first-touch attribution once (UTMs, referral code, landing page) at sign-up.
-- Unknown keys are dropped and values are trimmed; a referral code links the referrer,
-- never the user to himself. Later calls do nothing.
create or replace function public.set_acquisition(p_attr jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clean jsonb := '{}'::jsonb;
  v_key text;
  v_ref uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and acquisition is not null) then
    return false;
  end if;
  foreach v_key in array array['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'landing', 'referrer', 'first_seen'] loop
    if jsonb_typeof(p_attr -> v_key) = 'string' and char_length(p_attr ->> v_key) between 1 and 200 then
      v_clean := v_clean || jsonb_build_object(v_key, left(btrim(p_attr ->> v_key), 200));
    end if;
  end loop;
  if v_clean ? 'ref' then
    select id into v_ref from public.profiles where referral_code = upper(v_clean ->> 'ref') and id <> v_uid;
  end if;
  update public.profiles
  set acquisition = v_clean || jsonb_build_object('recorded_at', now()),
      referred_by = coalesce(referred_by, v_ref)
  where id = v_uid;
  return true;
end;
$$;
revoke execute on function public.set_acquisition from public, anon;
grant execute on function public.set_acquisition to authenticated;

-- The caller's referral code, created on first use.
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select referral_code into v_code from public.profiles where id = v_uid;
  if v_code is not null then
    return v_code;
  end if;
  loop
    v_code := public.new_invite_code();
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  update public.profiles set referral_code = v_code where id = v_uid;
  return v_code;
end;
$$;
revoke execute on function public.my_referral_code from public, anon;
grant execute on function public.my_referral_code to authenticated;

-- Public (website landing): who invites, as the username only.
create or replace function public.public_referrer(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('username', p.username)
  from public.profiles p
  where p.referral_code = upper(btrim(p_code));
$$;
grant execute on function public.public_referrer to anon, authenticated;

-- Public (website landing): a league invite shows the league name and its size, no member.
create or replace function public.public_league_invite(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', l.name,
    'members', (select count(*) from public.league_members m where m.league_id = l.id),
    'code', l.invite_code
  )
  from public.leagues l
  where l.invite_code = upper(btrim(p_code));
$$;
grant execute on function public.public_league_invite to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shares: frozen, public-by-link snapshots made by the user
-- ---------------------------------------------------------------------------

create table public.shares (
  code text primary key check (code ~ '^[a-z2-9]{10}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lineup', 'league', 'vault')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index shares_user_created_idx on public.shares (user_id, created_at);
alter table public.shares enable row level security;
create policy shares_owner_read on public.shares for select using (user_id = auth.uid());

create or replace function public.create_share(p_kind text, p_league_id uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
  v_payload jsonb;
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if (select count(*) from public.shares where user_id = v_uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'RATE_LIMITED:share';
  end if;
  select username into v_username from public.profiles where id = v_uid;

  if p_kind = 'lineup' then
    select jsonb_build_object(
      'game_day', ls.game_day,
      'total', ls.total,
      'counts', ls.counts,
      'players', (
        select jsonb_agg(jsonb_build_object('name', pl.name, 'slug', pl.public_slug, 'fpts', (e ->> 'fpts')::numeric,
          'captain', coalesce((e ->> 'captain')::boolean, false), 'played', coalesce((e ->> 'played')::boolean, false))
          order by (e ->> 'fpts')::numeric desc)
        from jsonb_array_elements(ls.per_player) e
        join public.players pl on pl.id = (e ->> 'player_id')::uuid
      ),
      'rank', (select s.rank from public.standings_snapshots s
               where s.user_id = v_uid and s.scope = 'global' and s.period = 'week' and s.day = ls.game_day)
    ) into v_payload
    from public.lineup_scores ls
    where ls.user_id = v_uid
    order by ls.game_day desc
    limit 1;
  elsif p_kind = 'league' then
    if p_league_id is null or not public.is_league_member(p_league_id, v_uid) then
      raise exception 'LEAGUE_FORBIDDEN';
    end if;
    select jsonb_build_object(
      'league', l.name,
      'members', (select count(*) from public.league_members m where m.league_id = l.id),
      'week_rank', (select r.rank from public.standings_rows('league', l.id, 'week', public.week_start(public.eastern_day())::text) r where r.user_id = v_uid),
      'week_points', (select r.points from public.standings_rows('league', l.id, 'week', public.week_start(public.eastern_day())::text) r where r.user_id = v_uid),
      'season_rank', (select r.rank from public.standings_rows('league', l.id, 'season', public.current_season_id()) r where r.user_id = v_uid)
    ) into v_payload
    from public.leagues l where l.id = p_league_id;
  elsif p_kind = 'vault' then
    select jsonb_build_object(
      'cards', coalesce((
        select jsonb_agg(t.c order by t.value_cents desc nulls last)
        from (
          select x.c, x.value_cents
          from (
            select distinct on (pa.id, ci.grade)
              jsonb_build_object('player', pl.name, 'set', s.name, 'season', s.season, 'number', ca.number,
                'parallel', pa.name, 'serial_run', pa.serial_run, 'grade', ci.grade, 'rookie', ca.is_rookie,
                'card_slug', ca.public_slug, 'value_cents', cp.price_cents, 'price_kind', cp.price_kind) as c,
              cp.price_cents as value_cents
            from public.collection_items ci
            join public.parallels pa on pa.id = ci.parallel_id
            join public.cards ca on ca.id = pa.card_id
            join public.card_sets s on s.id = ca.set_id
            join public.players pl on pl.id = ca.player_id
            left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade
            where ci.user_id = v_uid
            order by pa.id, ci.grade
          ) x
          order by x.value_cents desc nulls last
          limit 3
        ) t
      ), '[]'::jsonb),
      'card_count', (select count(*) from public.collection_items where user_id = v_uid)
    ) into v_payload;
  else
    raise exception 'SHARE_INVALID:kind';
  end if;

  if v_payload is null then
    raise exception 'SHARE_EMPTY:%', p_kind;
  end if;
  loop
    v_code := lower(public.new_invite_code()) || lower(substr(public.new_invite_code(), 1, 2));
    exit when not exists (select 1 from public.shares where code = v_code);
  end loop;
  insert into public.shares (code, user_id, kind, payload)
  values (v_code, v_uid, p_kind, v_payload || jsonb_build_object('username', coalesce(v_username, 'A collector')));
  return v_code;
end;
$$;
revoke execute on function public.create_share from public, anon;
grant execute on function public.create_share to authenticated;

-- Public read by code (website /share/[code] and its image). Never exposes the user id.
create or replace function public.public_share(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('code', code, 'kind', kind, 'payload', payload, 'created_at', created_at)
  from public.shares where code = lower(btrim(p_code));
$$;
grant execute on function public.public_share to anon, authenticated;
