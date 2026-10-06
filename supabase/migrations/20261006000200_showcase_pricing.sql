-- "Showcase" price coverage: cards priced every night regardless of user collections, so the
-- public Last night page and the catalog are populated before launch. Configurable in
-- app_settings; coverage logged per night in price_coverage.

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value, description) values
  ('showcase', jsonb_build_object(
    'enabled', true,
    'include_rookies', true,
    'top_players', 60,
    'window_days', 14,
    'parallels_per_card', 3,
    'grades', jsonb_build_array('RAW'),
    'rookie_base_grades', jsonb_build_array('RAW', 'PSA10'),
    'daily_call_budget', 3500
  ), 'Showcase price coverage: who gets priced every night and the daily eBay call budget (quota 5000/day)'),
  ('showcase_parallels', jsonb_build_object(
    'default', jsonb_build_array('Base'),
    '2025-26-topps-chrome', jsonb_build_array('Base', 'Refractor', 'Gold Refractor'),
    '2025-26-topps-basketball', jsonb_build_array('Base', 'Rainbow Foilboard', 'Gold')
  ), 'Preferred parallels per set (most traded), used until listing counts rank them');

create table public.price_coverage (
  day date not null,
  reason text not null,
  requested integer not null default 0,
  priced integer not null default 0,
  skipped integer not null default 0,
  primary key (day, reason)
);
alter table public.price_coverage enable row level security;
revoke all on public.price_coverage from anon, authenticated;

-- Players ranked by recent performance (game score) with a bonus for followers.
create or replace function public.top_players_recent(p_limit integer default 60, p_window_days integer default 14)
returns table (player_id uuid, score numeric, games integer, followers integer)
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select l.player_id,
      avg(coalesce(l.points, 0) + 1.2 * coalesce(l.rebounds, 0) + 1.5 * coalesce(l.assists, 0)
          + 3 * coalesce(l.steals, 0) + 3 * coalesce(l.blocks, 0)) as game_score,
      count(*)::integer as games
    from public.player_game_lines l
    join public.games g on g.id = l.game_id
    where g.game_day >= ((now() at time zone 'America/New_York')::date - p_window_days)
    group by l.player_id
  ),
  follows as (
    select fp.player_id, count(*)::integer as followers from public.followed_players fp group by fp.player_id
  )
  select r.player_id, round(r.game_score + 2 * coalesce(f.followers, 0), 1), r.games, coalesce(f.followers, 0)
  from recent r
  left join follows f on f.player_id = r.player_id
  order by 2 desc, r.games desc
  limit p_limit;
$$;
revoke execute on function public.top_players_recent from public, anon, authenticated;

-- (parallel, grade) pairs to price for the showcase, with a priority (1 = played last night).
create or replace function public.showcase_pairs()
returns table (parallel_id uuid, grade public.grade, reason text, priority integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cfg jsonb;
  prefs jsonb;
  v_enabled boolean;
  v_rookies boolean;
  v_top integer;
  v_window integer;
  v_per_card integer;
  v_grades public.grade[];
  v_rookie_base_grades public.grade[];
  v_last_night date;
begin
  select value into cfg from public.app_settings where key = 'showcase';
  select value into prefs from public.app_settings where key = 'showcase_parallels';
  v_enabled := coalesce((cfg->>'enabled')::boolean, false);
  if not v_enabled then return; end if;
  v_rookies := coalesce((cfg->>'include_rookies')::boolean, true);
  v_top := coalesce((cfg->>'top_players')::integer, 60);
  v_window := coalesce((cfg->>'window_days')::integer, 14);
  v_per_card := coalesce((cfg->>'parallels_per_card')::integer, 3);
  select coalesce(array_agg(x::public.grade), array['RAW'::public.grade]) into v_grades from jsonb_array_elements_text(coalesce(cfg->'grades', '["RAW"]'::jsonb)) x;
  select coalesce(array_agg(x::public.grade), array['RAW'::public.grade]) into v_rookie_base_grades from jsonb_array_elements_text(coalesce(cfg->'rookie_base_grades', '["RAW"]'::jsonb)) x;

  select max(g.game_day) into v_last_night from public.games g
  where exists (select 1 from public.player_game_lines l where l.game_id = g.id);

  return query
  with selected_players as (
    select l.player_id, 1 as priority, 'played_last_night'::text as reason
    from public.player_game_lines l join public.games g on g.id = l.game_id
    where g.game_day = v_last_night
    union all
    select c.player_id, 2, 'rookie' from public.cards c where v_rookies and c.is_rookie
    union all
    select t.player_id, 3, 'top_player' from public.top_players_recent(v_top, v_window) t
  ),
  players_ranked as (
    select sp.player_id, min(sp.priority) as priority,
      (array_agg(sp.reason order by sp.priority))[1] as reason
    from selected_players sp group by sp.player_id
  ),
  cards_sel as (
    select c.id as card_id, c.is_rookie, s.slug as set_slug, pr.priority, pr.reason
    from players_ranked pr
    join public.cards c on c.player_id = pr.player_id
    join public.card_sets s on s.id = c.set_id
    where v_rookies and c.is_rookie or pr.priority <= 3
  ),
  parallel_rank as (
    select par.id as parallel_id, cs.card_id, cs.is_rookie, cs.priority, cs.reason, par.name,
      case when par.name = 'Base' then 0 else 1 end as base_first,
      -- preference list for the set (position), then listing counts, then name
      coalesce((
        select pos from jsonb_array_elements_text(coalesce(prefs->cs.set_slug, prefs->'default')) with ordinality as p(name, pos)
        where p.name = par.name or par.name like p.name || '%' limit 1
      ), 999) as pref_pos,
      coalesce((select max(cp.sample_size) from public.current_prices cp where cp.parallel_id = par.id), 0) as listings
    from cards_sel cs
    join public.parallels par on par.card_id = cs.card_id
  ),
  chosen as (
    select *, row_number() over (partition by card_id order by base_first, pref_pos, listings desc, name) as rn
    from parallel_rank
  )
  select ch.parallel_id, g.grade, ch.reason, ch.priority
  from chosen ch
  cross join lateral (
    select unnest(case when ch.is_rookie and ch.name = 'Base' then v_rookie_base_grades else v_grades end) as grade
  ) g
  where ch.rn <= v_per_card
  order by ch.priority, ch.card_id, ch.rn;
end;
$$;
revoke execute on function public.showcase_pairs from public, anon, authenticated;

-- Work list for job-prices: user-driven pairs first (priority 0), then the showcase.
drop function if exists public.parallels_to_price(integer);
create or replace function public.parallels_to_price(p_rookie_limit integer default 50)
returns table (
  parallel_id uuid,
  grade public.grade,
  parallel_name text,
  serial_run integer,
  card_number text,
  player_name text,
  set_name text,
  season text,
  reason text,
  priority integer,
  current_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with wanted as (
    select ci.parallel_id, ci.grade, 'collection'::text as reason, 0 as priority from public.collection_items ci
    union
    select pa.parallel_id, pa.grade, 'alert', 0 from public.price_alerts pa where pa.triggered_at is null
    union
    select sp.parallel_id, sp.grade, sp.reason, sp.priority from public.showcase_pairs() sp
  ),
  dedup as (
    select w.parallel_id, w.grade, min(w.priority) as priority,
      (array_agg(w.reason order by w.priority))[1] as reason
    from wanted w group by w.parallel_id, w.grade
  )
  select par.id, d.grade, par.name, par.serial_run, c.number, pl.name, s.name, s.season, d.reason, d.priority, cp.price_cents
  from dedup d
  join public.parallels par on par.id = d.parallel_id
  join public.cards c on c.id = par.card_id
  join public.players pl on pl.id = c.player_id
  join public.card_sets s on s.id = c.set_id
  left join public.current_prices cp on cp.parallel_id = par.id and cp.grade = d.grade
  order by d.priority, pl.name, c.number, par.name, d.grade;
$$;
revoke execute on function public.parallels_to_price from public, anon, authenticated;

-- Daily call budget read by job-prices.
create or replace function public.price_call_budget()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((value->>'daily_call_budget')::integer, 3500) from public.app_settings where key = 'showcase';
$$;
revoke execute on function public.price_call_budget from public, anon, authenticated;

create or replace function public.record_price_coverage(p_day date, p_reason text, p_requested integer, p_priced integer, p_skipped integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.price_coverage (day, reason, requested, priced, skipped)
  values (p_day, p_reason, p_requested, p_priced, p_skipped)
  on conflict (day, reason) do update
    set requested = excluded.requested, priced = excluded.priced, skipped = excluded.skipped;
$$;
revoke execute on function public.record_price_coverage from public, anon, authenticated;
