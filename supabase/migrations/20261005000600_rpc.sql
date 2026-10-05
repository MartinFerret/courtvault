-- Business logic exposed to clients as RPC. Every function reads auth.uid() itself and never
-- takes a user id from the caller.

-- Collection list with card details, current price and 24h change, for the Vault screen.
create view public.collection_items_detailed
with (security_invoker = true) as
select
  ci.id,
  ci.user_id,
  ci.parallel_id,
  ci.grade,
  ci.serial_number,
  ci.purchase_cents,
  ci.photo_path,
  ci.created_at,
  par.name as parallel_name,
  par.serial_run,
  c.id as card_id,
  c.slug as card_slug,
  c.number as card_number,
  c.is_rookie,
  pl.id as player_id,
  pl.name as player_name,
  pl.slug as player_slug,
  pl.team,
  s.id as set_id,
  s.name as set_name,
  s.slug as set_slug,
  s.season,
  cp.price_cents as current_cents,
  cp.captured_at as price_captured_at,
  cp.buy_url
from public.collection_items ci
join public.parallels par on par.id = ci.parallel_id
join public.cards c on c.id = par.card_id
join public.players pl on pl.id = c.player_id
join public.card_sets s on s.id = c.set_id
left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade;

-- Total value and 24h change, split into market moves and newly added cards.
create or replace function public.collection_summary()
returns table (
  item_count integer,
  total_cents bigint,
  change_24h_cents bigint,
  market_change_cents bigint,
  added_cents bigint,
  invested_cents bigint,
  gain_cents bigint,
  is_premium boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select
      ci.created_at,
      ci.purchase_cents,
      cp.price_cents as now_cents,
      public.price_at(ci.parallel_id, ci.grade, now() - interval '24 hours') as prev_cents
    from public.collection_items ci
    left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade
    where ci.user_id = auth.uid()
  ),
  agg as (
    select
      count(*)::integer as item_count,
      coalesce(sum(now_cents), 0)::bigint as total_cents,
      coalesce(sum(case when created_at <= now() - interval '24 hours'
                        then now_cents - coalesce(prev_cents, now_cents) else 0 end), 0)::bigint as market_change_cents,
      coalesce(sum(case when created_at > now() - interval '24 hours' then now_cents else 0 end), 0)::bigint as added_cents,
      coalesce(sum(purchase_cents), 0)::bigint as invested_cents,
      coalesce(sum(case when purchase_cents is not null then now_cents - purchase_cents else 0 end), 0)::bigint as gain_cents
    from items
  )
  select
    item_count,
    total_cents,
    market_change_cents + added_cents,
    market_change_cents,
    added_cents,
    invested_cents,
    -- Gains/losses are a Premium feature.
    case when public.is_premium() then gain_cents else null end,
    public.is_premium()
  from agg;
$$;

-- Price history for a parallel and grade. Free: plan_limits.price_history_days. Premium: full.
create or replace function public.price_history(p_parallel_id uuid, p_grade public.grade)
returns table (captured_at timestamptz, price_cents integer, sample_size integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pp.captured_at, pp.price_cents, pp.sample_size
  from public.price_points pp
  where pp.parallel_id = p_parallel_id
    and pp.grade = p_grade
    and (
      public.is_premium()
      or pp.captured_at >= now() - make_interval(
        days => coalesce((select free_value from public.plan_limits where key = 'price_history_days'), 30)
      )
    )
  order by pp.captured_at;
$$;

-- "Last night": for each player the user follows or owns who played on p_day, the stat line
-- and the value change of the user's cards of that player. Free users get stat lines for
-- followed players only; other owned players come back locked (stats null).
-- morning_report_for() is service-role only (used by job-morning); clients call morning_report().
create type public.morning_report_row as (
  game_day date,
  player_id uuid,
  player_name text,
  player_slug text,
  team text,
  is_followed boolean,
  is_owned boolean,
  locked boolean,
  game_id uuid,
  home_team text,
  away_team text,
  home_score integer,
  away_score integer,
  minutes numeric,
  points integer,
  rebounds integer,
  assists integer,
  steals integer,
  blocks integer,
  cards_count integer,
  value_before_cents bigint,
  value_after_cents bigint
);

create or replace function public.morning_report_for(p_uid uuid, p_day date default null)
returns setof public.morning_report_row
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select
      coalesce(p_day, ((now() at time zone 'America/New_York')::date - 1)) as day,
      public.is_premium(p_uid) as premium
  ),
  owned as (
    select c.player_id, count(*)::integer as cards_count,
      sum(cp.price_cents)::bigint as value_after,
      sum(public.price_at(ci.parallel_id, ci.grade,
        ((select day from params)::timestamp + interval '18 hours') at time zone 'America/New_York'))::bigint as value_before
    from public.collection_items ci
    join public.parallels par on par.id = ci.parallel_id
    join public.cards c on c.id = par.card_id
    left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade
    where ci.user_id = p_uid
    group by c.player_id
  ),
  followed as (
    select fp.player_id from public.followed_players fp where fp.user_id = p_uid
  ),
  relevant as (
    select player_id from owned
    union
    select player_id from followed
  ),
  unlocked as (
    select pl.id as player_id,
      ((select premium from params) or pl.id in (select player_id from followed)) as visible
    from public.players pl
  )
  select
    (select day from params),
    pl.id,
    pl.name,
    pl.slug,
    pl.team,
    (pl.id in (select player_id from followed)),
    (pl.id in (select player_id from owned)),
    not u.visible as locked,
    g.id,
    g.home_team,
    g.away_team,
    g.home_score,
    g.away_score,
    case when u.visible then l.minutes end,
    case when u.visible then l.points end,
    case when u.visible then l.rebounds end,
    case when u.visible then l.assists end,
    case when u.visible then l.steals end,
    case when u.visible then l.blocks end,
    coalesce(o.cards_count, 0),
    o.value_before,
    o.value_after
  from relevant r
  join public.players pl on pl.id = r.player_id
  join unlocked u on u.player_id = pl.id
  join public.player_game_lines l on l.player_id = pl.id
  join public.games g on g.id = l.game_id and g.game_day = (select day from params)
  left join owned o on o.player_id = pl.id
  order by (o.value_after - o.value_before) desc nulls last, l.points desc nulls last;
$$;
revoke execute on function public.morning_report_for from public, anon, authenticated;

create or replace function public.morning_report(p_day date default null)
returns setof public.morning_report_row
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.morning_report_for(auth.uid(), p_day);
$$;

-- Users to notify in the morning: everyone with a push token and at least one relevant player
-- who played on p_day. Service role only.
create or replace function public.morning_recipients(p_day date default null)
returns table (user_id uuid, push_token text, headline_player text, headline_points integer, value_change_cents bigint, players_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.push_token,
    (select r.player_name from public.morning_report_for(p.id, p_day) r where not r.locked order by r.points desc nulls last limit 1),
    (select r.points from public.morning_report_for(p.id, p_day) r where not r.locked order by r.points desc nulls last limit 1),
    (select coalesce(sum(r.value_after_cents - r.value_before_cents), 0) from public.morning_report_for(p.id, p_day) r),
    (select count(*)::integer from public.morning_report_for(p.id, p_day) r)
  from public.profiles p
  where p.push_token is not null
    and exists (select 1 from public.morning_report_for(p.id, p_day));
$$;
revoke execute on function public.morning_recipients from public, anon, authenticated;

-- Search across players, sets and cards. Used by the website and the app's manual fallback.
create or replace function public.search_catalog(q text, p_limit integer default 20)
returns table (kind text, id uuid, slug text, title text, subtitle text, score real)
language sql
stable
security definer
set search_path = ''
as $$
  with needle as (select trim(q) as q)
  select * from (
    select 'player'::text, pl.id, pl.slug, pl.name, pl.team,
      greatest(extensions.similarity(pl.name, (select q from needle)),
               case when pl.name ilike '%' || (select q from needle) || '%' then 0.9 else 0 end)::real
    from public.players pl
    where pl.name ilike '%' || (select q from needle) || '%'
       or extensions.similarity(pl.name, (select q from needle)) > 0.3
    union all
    select 'set', s.id, s.slug, s.season || ' ' || s.name, s.season,
      case when s.name ilike '%' || (select q from needle) || '%' or s.season = (select q from needle) then 0.8 else 0.4 end::real
    from public.card_sets s
    where s.name ilike '%' || (select q from needle) || '%' or s.season ilike '%' || (select q from needle) || '%'
    union all
    select 'card', c.id, c.slug, '#' || c.number || ' ' || pl.name, s.season || ' ' || s.name,
      case when c.number = (select q from needle) then 1.0
           else extensions.similarity(pl.name, (select q from needle)) end::real
    from public.cards c
    join public.players pl on pl.id = c.player_id
    join public.card_sets s on s.id = c.set_id
    where c.number = (select q from needle)
       or pl.name ilike '%' || (select q from needle) || '%'
       or extensions.similarity(pl.name, (select q from needle)) > 0.3
  ) results (kind, id, slug, title, subtitle, score)
  where length((select q from needle)) > 0
  order by score desc, title
  limit p_limit;
$$;

-- Most valuable rookie cards, ranked by the Base parallel's RAW price.
create or replace function public.rookie_rankings(p_limit integer default 20)
returns table (
  card_id uuid,
  card_slug text,
  card_number text,
  player_id uuid,
  player_name text,
  player_slug text,
  team text,
  set_id uuid,
  set_name text,
  set_slug text,
  season text,
  parallel_id uuid,
  price_cents integer,
  price_captured_at timestamptz,
  change_7d_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, c.slug, c.number,
    pl.id, pl.name, pl.slug, pl.team,
    s.id, s.name, s.slug, s.season,
    par.id,
    cp.price_cents, cp.captured_at,
    cp.price_cents - public.price_at(par.id, 'RAW', now() - interval '7 days')
  from public.cards c
  join public.players pl on pl.id = c.player_id
  join public.card_sets s on s.id = c.set_id
  join public.parallels par on par.card_id = c.id and par.name = 'Base'
  left join public.current_prices cp on cp.parallel_id = par.id and cp.grade = 'RAW'
  where c.is_rookie
  order by cp.price_cents desc nulls last, pl.name
  limit p_limit;
$$;

-- Checklist completion for the Sets screen.
create or replace function public.set_progress()
returns table (
  set_id uuid,
  set_slug text,
  set_name text,
  season text,
  is_followed boolean,
  total_cards integer,
  owned_cards integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id, s.slug, s.name, s.season,
    exists (select 1 from public.checklist_follows cf where cf.set_id = s.id and cf.user_id = auth.uid()),
    (select count(*)::integer from public.cards c where c.set_id = s.id),
    (
      select count(distinct c.id)::integer
      from public.collection_items ci
      join public.parallels par on par.id = ci.parallel_id
      join public.cards c on c.id = par.card_id
      where ci.user_id = auth.uid() and c.set_id = s.id
    )
  from public.card_sets s
  order by s.season desc, s.name;
$$;
