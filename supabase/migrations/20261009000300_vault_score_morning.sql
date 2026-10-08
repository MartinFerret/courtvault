-- Vault Score in the morning report: one summary per user for a scored night, read by
-- job-morning (push and email) in a single call. Service role only.

create or replace function public.vault_score_morning(p_day date)
returns table (user_id uuid, summary jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with prev as (
    select max(day) as day from public.standings_snapshots where day < p_day
  )
  select
    ls.user_id,
    jsonb_build_object(
      'total', ls.total,
      'counts', ls.counts,
      'top', (
        -- Player of the game: best line before the captain bonus (as on the Last night recap).
        select jsonb_build_object('name', pl.name, 'fpts', (e ->> 'fpts')::numeric, 'captain', coalesce((e ->> 'captain')::boolean, false))
        from jsonb_array_elements(ls.per_player) e
        join public.players pl on pl.id = (e ->> 'player_id')::uuid
        where coalesce((e ->> 'played')::boolean, false)
        order by (e ->> 'fpts')::numeric / case when coalesce((e ->> 'captain')::boolean, false) then 2 else 1 end desc
        limit 1
      ),
      'rank', g.rank,
      'movement', case when gp.rank is null or g.rank is null then null else gp.rank - g.rank end,
      'leagues', coalesce((
        select jsonb_agg(jsonb_build_object('name', l.name, 'rank', s.rank,
          'movement', (select sp.rank from public.standings_snapshots sp, prev
                        where sp.day = prev.day and sp.scope = 'league' and sp.scope_id = s.scope_id
                          and sp.period = 'week' and sp.user_id = s.user_id) - s.rank)
          order by l.name)
        from public.standings_snapshots s
        join public.leagues l on l.id = s.scope_id
        where s.day = p_day and s.scope = 'league' and s.period = 'week' and s.user_id = ls.user_id
      ), '[]'::jsonb)
    )
  from public.lineup_scores ls
  left join public.standings_snapshots g
    on g.day = p_day and g.scope = 'global' and g.period = 'week' and g.user_id = ls.user_id
  left join prev on true
  left join public.standings_snapshots gp
    on gp.day = prev.day and gp.scope = 'global' and gp.period = 'week' and gp.user_id = ls.user_id
  where ls.game_day = p_day;
$$;
revoke execute on function public.vault_score_morning from public, anon, authenticated;
