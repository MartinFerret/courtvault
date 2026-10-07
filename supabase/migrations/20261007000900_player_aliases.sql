-- Player identity: Topps checklists misspell names ("Cade Cunnigham", "Deni Avdja", "Zach LAVine")
-- and every spelling used to create a new player, a new page and a new URL. This migration adds
-- the alias table, a normalized name key, the list of pairs confirmed distinct (Nikola Jović is
-- not Nikola Jokić), the resolver used by the import script, the merge function, and merges
-- the duplicates found in the 2025-26 catalog.
create extension if not exists fuzzystrmatch with schema extensions;

-- "P.J. Washington Jr." -> "pjwashingtonjr"; "Zach LAVine" -> "zachlavine"; "Jović" -> "jovic".
create or replace function public.player_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    lower(translate(coalesce(p_name, ''),
      'àáâäãåāçćčèéêëēìíîïñòóôöõøùúûüýÿšžłđ',
      'aaaaaaaccceeeeeiiiinoooooouuuuyyszld')),
    '[^a-z]', '', 'g');
$$;

-- Key without a generational suffix: "garypaytonii" -> "garypayton". Two names that differ only
-- by the suffix are never merged automatically (father and son both have cards).
create or replace function public.player_base_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(public.player_key(p_name), '(jr|sr|ii|iii|iv)$', '');
$$;

create table public.player_aliases (
  alias_key text primary key,
  alias text not null,
  player_id uuid not null references public.players (id) on delete cascade,
  old_slug text unique,
  old_public_slug text unique,
  source text not null,
  created_at timestamptz not null default now()
);
create index player_aliases_player_id_idx on public.player_aliases (player_id);
alter table public.player_aliases enable row level security;
create policy "aliases are public" on public.player_aliases for select to anon, authenticated using (true);

-- Pairs of real, different players whose names are close enough to trip the fuzzy match.
create table public.player_distinct (
  key_a text not null,
  key_b text not null,
  note text,
  primary key (key_a, key_b),
  check (key_a < key_b)
);
alter table public.player_distinct enable row level security;
insert into public.player_distinct (key_a, key_b, note) values
  (least(public.player_key('Nikola Jović'), public.player_key('Nikola Jokić')), greatest(public.player_key('Nikola Jović'), public.player_key('Nikola Jokić')), 'Heat forward vs Nuggets center'),
  (least(public.player_key('Jaylin Williams'), public.player_key('Jalen Williams')), greatest(public.player_key('Jaylin Williams'), public.player_key('Jalen Williams')), 'Thunder teammates'),
  (least(public.player_key('Mark Williams'), public.player_key('Amari Williams')), greatest(public.player_key('Mark Williams'), public.player_key('Amari Williams')), null),
  (least(public.player_key('Mikal Bridges'), public.player_key('Miles Bridges')), greatest(public.player_key('Mikal Bridges'), public.player_key('Miles Bridges')), null),
  (least(public.player_key('Jalen Brunson'), public.player_key('Jalen Johnson')), greatest(public.player_key('Jalen Brunson'), public.player_key('Jalen Johnson')), null),
  (least(public.player_key('Reed Sheppard'), public.player_key('Ben Sheppard')), greatest(public.player_key('Reed Sheppard'), public.player_key('Ben Sheppard')), null),
  (least(public.player_key('Jalen Green'), public.player_key('Jalen Duren')), greatest(public.player_key('Jalen Green'), public.player_key('Jalen Duren')), null),
  (least(public.player_key('Jalen Green'), public.player_key('Jalen Greene')), greatest(public.player_key('Jalen Green'), public.player_key('Jalen Greene')), 'two different players');

create or replace function public.players_distinct(p_a text, p_b text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.player_distinct d
    where d.key_a = least(public.player_key(p_a), public.player_key(p_b))
      and d.key_b = greatest(public.player_key(p_a), public.player_key(p_b))
  );
$$;

-- Resolver for the import script. Per name, in this order:
--   exact     the key matches a player or an alias (casing, punctuation, diacritics ignored)
--   suffix    only a generational suffix differs from an existing player: new player, review
--   merge     exactly one existing player within 2 edits or 0.7 trigram similarity, pair not
--             confirmed distinct: use that player, the import records the alias
--   ambiguous several candidates: new player, review
--   new       nothing close
create or replace function public.resolve_player_names(p_names text[])
returns table (name text, status text, player_id uuid, player_name text, note text)
language sql
stable
security definer
set search_path = ''
as $$
  with input as (
    select distinct n as name, public.player_key(n) as key from unnest(p_names) as n
  ),
  exact as (
    select i.name, p.id as player_id, p.name as player_name
    from input i
    join public.players p on public.player_key(p.name) = i.key
    union
    select i.name, a.player_id, p.name
    from input i
    join public.player_aliases a on a.alias_key = i.key
    join public.players p on p.id = a.player_id
  ),
  candidates as (
    select i.name, p.id as player_id, p.name as player_name,
      extensions.levenshtein(i.key, public.player_key(p.name)) as distance,
      extensions.similarity(i.name, p.name) as sim,
      public.player_base_key(i.name) = public.player_base_key(p.name) as suffix_only
    from input i
    join public.players p on public.player_key(p.name) <> i.key
      and (extensions.levenshtein(i.key, public.player_key(p.name)) <= 2
        or extensions.similarity(i.name, p.name) >= 0.7
        or public.player_base_key(i.name) = public.player_base_key(p.name))
    where not exists (select 1 from exact e where e.name = i.name)
      and not public.players_distinct(i.name, p.name)
  ),
  summary as (
    select name,
      count(*) as n,
      bool_or(suffix_only) as suffix_only,
      (array_agg(player_id order by distance, sim desc))[1] as player_id,
      (array_agg(player_name order by distance, sim desc))[1] as player_name,
      string_agg(player_name || ' (' || distance || ' edits, ' || round(sim::numeric, 2) || ')', ', ' order by distance) as detail
    from candidates group by name
  )
  select i.name,
    case
      when e.player_id is not null then 'exact'
      when s.name is null then 'new'
      when s.suffix_only then 'suffix'
      when s.n > 1 then 'ambiguous'
      else 'merge'
    end,
    case when e.player_id is not null then e.player_id when s.n = 1 and not s.suffix_only then s.player_id end,
    case when e.player_id is not null then e.player_name when s.n = 1 and not s.suffix_only then s.player_name end,
    case when e.player_id is null then s.detail end
  from input i
  left join exact e on e.name = i.name
  left join summary s on s.name = i.name;
$$;
revoke execute on function public.resolve_player_names(text[]) from public, anon, authenticated;

-- Moves everything from a duplicate to the canonical player, keeps the duplicate's name and
-- slugs as aliases (old URLs redirect), deletes the duplicate.
create or replace function public.merge_players(p_duplicate uuid, p_canonical uuid, p_source text default 'merge')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  dup public.players%rowtype;
begin
  if p_duplicate = p_canonical then raise exception 'merge_players: same player'; end if;
  select * into dup from public.players where id = p_duplicate;
  if not found then raise exception 'merge_players: duplicate % not found', p_duplicate; end if;
  if not exists (select 1 from public.players where id = p_canonical) then
    raise exception 'merge_players: canonical % not found', p_canonical;
  end if;

  update public.cards set player_id = p_canonical where player_id = p_duplicate;
  delete from public.player_game_lines l
    where l.player_id = p_duplicate
      and exists (select 1 from public.player_game_lines c where c.player_id = p_canonical and c.game_id = l.game_id);
  update public.player_game_lines set player_id = p_canonical where player_id = p_duplicate;
  insert into public.followed_players (user_id, player_id, created_at)
    select user_id, p_canonical, created_at from public.followed_players where player_id = p_duplicate
    on conflict do nothing;
  delete from public.followed_players where player_id = p_duplicate;
  update public.player_aliases set player_id = p_canonical where player_id = p_duplicate;
  if dup.highlightly_id is not null then
    update public.players set highlightly_id = coalesce(highlightly_id, dup.highlightly_id) where id = p_canonical;
  end if;

  delete from public.players where id = p_duplicate;
  insert into public.player_aliases (alias_key, alias, player_id, old_slug, old_public_slug, source)
    values (public.player_key(dup.name), dup.name, p_canonical, dup.slug, dup.public_slug, p_source)
    on conflict (alias_key) do update set player_id = excluded.player_id,
      old_slug = coalesce(public.player_aliases.old_slug, excluded.old_slug),
      old_public_slug = coalesce(public.player_aliases.old_public_slug, excluded.old_public_slug);
  perform public.refresh_public_slugs();
end;
$$;
revoke execute on function public.merge_players(uuid, uuid, text) from public, anon, authenticated;

-- Duplicates found in the 2025-26 catalog on 2026-10-07 (Topps typos and name variants).
do $$
declare
  pair record;
  dup_id uuid;
  canon_id uuid;
begin
  for pair in
    select * from (values
      ('cade-cunnigham', 'cade-cunningham'),
      ('deni-avdja', 'deni-avdija'),
      ('alperun-sengun', 'alperen-sengun'),
      ('onyeka-okungwu', 'onyeka-okongwu'),
      ('p-j-washington-jr', 'p-j-washington'),
      ('ronald-holland-ii', 'ron-holland-ii')
    ) as v(duplicate_slug, canonical_slug)
  loop
    select id into dup_id from public.players where slug = pair.duplicate_slug;
    select id into canon_id from public.players where slug = pair.canonical_slug;
    if dup_id is not null and canon_id is not null then
      perform public.merge_players(dup_id, canon_id, 'catalog cleanup 2026-10-07');
    end if;
  end loop;
end $$;

-- Casing typo kept as an alias so the next import does not reintroduce it.
update public.players set name = 'Zach LaVine' where slug = 'zach-lavine' and name <> 'Zach LaVine';
