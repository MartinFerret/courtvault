-- Spreadsheet import matching: an exact set name (ignoring "Topps", "Basketball" and the season)
-- must win over a longer sibling set. With the full catalog, "Topps Chrome #251" scored within
-- 0.1 of "Topps Chrome Sapphire #251" (same player, same number) and came back ambiguous.
-- The score is computed once, ranked, and clamped to 0..1 in the output.
-- "2025-26 Topps Chrome Basketball" -> "chrome": what a collector would type in a spreadsheet.
create or replace function public.import_set_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(
    regexp_replace(lower(coalesce(p_name, '')), '\m(topps|basketball|20[0-9]{2}-[0-9]{2})\M', ' ', 'g'),
    '\s+', ' ', 'g'));
$$;

create or replace function public.match_import_rows(p_rows jsonb)
returns table (
  row_index integer,
  status text,
  score real,
  card_id uuid,
  card_slug text,
  card_number text,
  player_name text,
  set_name text,
  season text,
  parallel_id uuid,
  parallel_name text,
  serial_run integer,
  parallels jsonb,
  candidates jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with rows as (
    select (r.ordinality - 1)::integer as idx,
      nullif(trim(r.value->>'player'), '') as player,
      nullif(trim(r.value->>'set'), '') as set_text,
      nullif(trim(r.value->>'season'), '') as season_text,
      nullif(regexp_replace(coalesce(r.value->>'number', ''), '[^0-9A-Za-z-]', '', 'g'), '') as number_text,
      nullif(trim(r.value->>'parallel'), '') as parallel_text
    from jsonb_array_elements(p_rows) with ordinality as r(value, ordinality)
  ),
  raw_scores as (
    select rw.idx, c.id as card_id, c.slug, c.number, pl.name as player_name, s.name as set_name, s.season,
      (
        0.6 * extensions.similarity(pl.name, rw.player)
        + case when rw.number_text is not null and lower(c.number) = lower(rw.number_text) then 0.3 else 0 end
        + 0.1 * greatest(
            extensions.similarity(s.season || ' ' || s.name, coalesce(rw.season_text || ' ', '') || coalesce(rw.set_text, '')),
            case when rw.set_text is null then 0.5 else 0 end
          )
        + case when rw.set_text is not null
            and public.import_set_key(s.name) = public.import_set_key(rw.set_text) then 0.1 else 0 end
        - case when rw.season_text is not null and rw.season_text not like s.season || '%' and s.season not like rw.season_text || '%' then 0.2 else 0 end
      )::real as score
    from rows rw
    join public.players pl on rw.player is not null and (pl.name ilike '%' || rw.player || '%' or extensions.similarity(pl.name, rw.player) > 0.3)
    join public.cards c on c.player_id = pl.id
    join public.card_sets s on s.id = c.set_id
  ),
  scored as (
    select x.*, row_number() over (partition by x.idx order by x.score desc, x.season desc, x.number) as rank
    from raw_scores x
  ),
  best as (
    select s1.*, (select s2.score from scored s2 where s2.idx = s1.idx and s2.rank = 2) as runner_up
    from scored s1 where s1.rank = 1
  ),
  with_parallel as (
    select b.*, rw.parallel_text,
      (
        select par.id from public.parallels par
        where par.card_id = b.card_id
        order by
          case when rw.parallel_text is null or lower(rw.parallel_text) in ('base', 'base card', '') then (par.name = 'Base')::integer else 0 end desc,
          case when rw.parallel_text ~ '/\s*([0-9]+)' and par.serial_run = (regexp_match(rw.parallel_text, '/\s*([0-9]+)'))[1]::integer then 1 else 0 end desc,
          extensions.similarity(par.name, coalesce(regexp_replace(rw.parallel_text, '/\s*[0-9]+', ''), 'Base')) desc,
          par.serial_run desc nulls first
        limit 1
      ) as parallel_id
    from best b
    join rows rw on rw.idx = b.idx
  )
  select
    rw.idx,
    case
      when wp.card_id is null then 'unmatched'
      when wp.score >= 0.55 and (wp.runner_up is null or wp.score - wp.runner_up >= 0.1) then 'matched'
      when wp.score >= 0.4 then 'ambiguous'
      else 'unmatched'
    end,
    least(coalesce(wp.score, 0), 1)::real,
    wp.card_id, wp.slug, wp.number, wp.player_name, wp.set_name, wp.season,
    par.id, par.name, par.serial_run,
    (select coalesce(jsonb_agg(jsonb_build_object('id', p2.id, 'name', p2.name, 'serial_run', p2.serial_run)
       order by (p2.name = 'Base') desc, p2.serial_run desc nulls first, p2.name), '[]'::jsonb)
     from public.parallels p2 where p2.card_id = wp.card_id),
    (select coalesce(jsonb_agg(jsonb_build_object('card_id', sc.card_id, 'label', '#' || sc.number || ' ' || sc.player_name || ' · ' || sc.season || ' ' || sc.set_name, 'score', least(sc.score, 1))
       order by sc.rank), '[]'::jsonb)
     from scored sc where sc.idx = rw.idx and sc.rank <= 3)
  from rows rw
  left join with_parallel wp on wp.idx = rw.idx
  left join public.parallels par on par.id = wp.parallel_id
  order by rw.idx;
$$;
