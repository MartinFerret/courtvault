-- Spreadsheet import (web app): match rows of a CSV against the catalog, insert what matches
-- inside the plan limit, keep the rest for review. Logic lives here, never in clients.

-- Rows the import could not match (or the user set aside). Reviewed from the import page.
create table public.import_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  raw jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index import_reviews_user_id_idx on public.import_reviews (user_id);
alter table public.import_reviews enable row level security;
create policy "own import reviews" on public.import_reviews
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Matches each row ({player, set, season, number, parallel}) to a card and a parallel.
-- score: 0..1. matched = score >= 0.55 and a clear lead over the runner-up; ambiguous =
-- plausible candidates without a clear winner; unmatched = nothing close.
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
  scored as (
    select rw.idx, c.id as card_id, c.slug, c.number, pl.name as player_name, s.name as set_name, s.season,
      (
        0.6 * extensions.similarity(pl.name, rw.player)
        + case when rw.number_text is not null and lower(c.number) = lower(rw.number_text) then 0.3 else 0 end
        + 0.1 * greatest(
            extensions.similarity(s.season || ' ' || s.name, coalesce(rw.season_text || ' ', '') || coalesce(rw.set_text, '')),
            case when rw.set_text is null then 0.5 else 0 end
          )
        - case when rw.season_text is not null and rw.season_text not like s.season || '%' and s.season not like rw.season_text || '%' then 0.2 else 0 end
      )::real as score,
      row_number() over (partition by rw.idx order by
        0.6 * extensions.similarity(pl.name, rw.player)
        + case when rw.number_text is not null and lower(c.number) = lower(rw.number_text) then 0.3 else 0 end
        + 0.1 * greatest(
            extensions.similarity(s.season || ' ' || s.name, coalesce(rw.season_text || ' ', '') || coalesce(rw.set_text, '')),
            case when rw.set_text is null then 0.5 else 0 end
          )
        - case when rw.season_text is not null and rw.season_text not like s.season || '%' and s.season not like rw.season_text || '%' then 0.2 else 0 end
        desc, s.season desc, c.number) as rank
    from rows rw
    join public.players pl on rw.player is not null and (pl.name ilike '%' || rw.player || '%' or extensions.similarity(pl.name, rw.player) > 0.3)
    join public.cards c on c.player_id = pl.id
    join public.card_sets s on s.id = c.set_id
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
    coalesce(wp.score, 0),
    wp.card_id, wp.slug, wp.number, wp.player_name, wp.set_name, wp.season,
    par.id, par.name, par.serial_run,
    (select coalesce(jsonb_agg(jsonb_build_object('id', p2.id, 'name', p2.name, 'serial_run', p2.serial_run)
       order by (p2.name = 'Base') desc, p2.serial_run desc nulls first, p2.name), '[]'::jsonb)
     from public.parallels p2 where p2.card_id = wp.card_id),
    (select coalesce(jsonb_agg(jsonb_build_object('card_id', sc.card_id, 'label', '#' || sc.number || ' ' || sc.player_name || ' · ' || sc.season || ' ' || sc.set_name, 'score', sc.score)
       order by sc.rank), '[]'::jsonb)
     from scored sc where sc.idx = rw.idx and sc.rank <= 3)
  from rows rw
  left join with_parallel wp on wp.idx = rw.idx
  left join public.parallels par on par.id = wp.parallel_id
  order by rw.idx;
$$;
grant execute on function public.match_import_rows(jsonb) to authenticated;

-- Inserts the confirmed items ({parallel_id, grade, serial_number, purchase_cents}) one by one
-- so the plan limit trigger decides where to stop. Returns what happened; the client opens the
-- paywall when limit_reached is true. Unconfirmed rows ({raw, reason}) go to import_reviews.
create or replace function public.import_collection(p_items jsonb, p_reviews jsonb default '[]'::jsonb)
returns table (inserted integer, skipped integer, limit_reached boolean, reviews_saved integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_limit boolean := false;
  v_reviews integer := 0;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if v_limit then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    begin
      insert into public.collection_items (user_id, parallel_id, grade, serial_number, purchase_cents)
      values (
        v_uid,
        (v_item->>'parallel_id')::uuid,
        coalesce(nullif(v_item->>'grade', ''), 'RAW')::public.grade,
        nullif(v_item->>'serial_number', '')::integer,
        nullif(v_item->>'purchase_cents', '')::integer
      );
      v_inserted := v_inserted + 1;
    exception
      when others then
        if sqlerrm like 'LIMIT_REACHED:%' then
          v_limit := true;
          v_skipped := v_skipped + 1;
        else
          raise;
        end if;
    end;
  end loop;
  insert into public.import_reviews (user_id, raw, reason)
  select v_uid, r.value->'raw', coalesce(r.value->>'reason', 'unmatched')
  from jsonb_array_elements(coalesce(p_reviews, '[]'::jsonb)) r;
  get diagnostics v_reviews = row_count;
  return query select v_inserted, v_skipped, v_limit, v_reviews;
end;
$$;
grant execute on function public.import_collection(jsonb, jsonb) to authenticated;
