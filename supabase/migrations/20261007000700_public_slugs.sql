-- Public URL slugs, frozen on 2026-10-07 (R22 to R25): the path carries the keyword words.
--   checklist: <set-slug>-basketball            e.g. 2025-26-topps-chrome-basketball
--   player:    <player-slug>-rookie-cards | -cards (rookie when any card in scope is a rookie card)
--   card:      <set-slug>-<player-slug>-rookie-card-<n> | -card-<n>
-- Internal slugs stay the import keys; public slugs are derived by refresh_public_slugs()
-- after every import. page_index_status drives the sitemap and the robots meta (quality gate).

alter table public.card_sets add column public_slug text unique;
alter table public.players add column public_slug text unique;
alter table public.cards add column public_slug text unique;

create or replace function public.refresh_public_slugs()
returns void
language sql
security definer
set search_path = ''
as $$
  -- '2025-26-topps-basketball' already ends with the word; only Chrome and friends get it appended.
  update public.card_sets set public_slug = case when slug like '%-basketball' then slug else slug || '-basketball' end
    where public_slug is distinct from case when slug like '%-basketball' then slug else slug || '-basketball' end;
  update public.players p set public_slug = p.slug || case
      when exists (select 1 from public.cards c where c.player_id = p.id and c.is_rookie) then '-rookie-cards' else '-cards' end
    where p.public_slug is distinct from p.slug || case
      when exists (select 1 from public.cards c where c.player_id = p.id and c.is_rookie) then '-rookie-cards' else '-cards' end;
  update public.cards c set public_slug = s.slug || '-' || p.slug || case when c.is_rookie then '-rookie-card-' else '-card-' end || lower(c.number)
    from public.card_sets s, public.players p
    where s.id = c.set_id and p.id = c.player_id
      and c.public_slug is distinct from s.slug || '-' || p.slug || case when c.is_rookie then '-rookie-card-' else '-card-' end || lower(c.number);
$$;
revoke execute on function public.refresh_public_slugs from public, anon, authenticated;
select public.refresh_public_slugs();

-- Quality gate (plan section 4): what the sitemap lists and what carries index,follow.
create or replace view public.page_index_status as
  with card_prices as (
    select par.card_id,
      max(cp.captured_at) as last_price_at,
      bool_or(cp.sample_size >= 5) as priced
    from public.parallels par
    join public.current_prices cp on cp.parallel_id = par.id
    group by par.card_id
  )
  select 'checklist'::text as kind, s.public_slug, s.id,
    (select count(*) from public.cards c where c.set_id = s.id) > 0 as indexable,
    greatest(
      (select max(c.created_at) from public.cards c where c.set_id = s.id),
      (select max(p.last_price_at) from public.cards c join card_prices p on p.card_id = c.id where c.set_id = s.id)
    ) as lastmod
  from public.card_sets s
  union all
  select 'player', pl.public_slug, pl.id,
    exists (select 1 from public.cards c where c.player_id = pl.id),
    greatest(
      (select max(p.last_price_at) from public.cards c join card_prices p on p.card_id = c.id where c.player_id = pl.id),
      (select max(g.game_day)::timestamp at time zone 'America/New_York' + interval '13 hours'
         from public.player_game_lines l join public.games g on g.id = l.game_id where l.player_id = pl.id),
      (select max(c.created_at) from public.cards c where c.player_id = pl.id)
    )
  from public.players pl
  union all
  select 'card', c.public_slug, c.id,
    coalesce(p.priced, false),
    coalesce(p.last_price_at, c.created_at)
  from public.cards c
  left join card_prices p on p.card_id = c.id;
grant select on public.page_index_status to anon, authenticated;
