begin;
select plan(12);

select is(public.player_key('P.J. Washington Jr.'), 'pjwashingtonjr', 'key drops punctuation and casing');
select is(public.player_key('Nikola Jović'), 'nikolajovic', 'key drops diacritics');
select is(public.player_base_key('Gary Payton II'), 'garypayton', 'base key drops the suffix');
select ok(public.players_distinct('Nikola Jokić', 'Nikola Jović'), 'Jokić and Jović are distinct');

-- Fixtures: the seed has Cooper Flagg; add a neighbour and an alias case.
insert into public.players (slug, name) values ('testo-playerson-ii', 'Testo Playerson II'), ('testo-playerson', 'Testo Playerson');

select is((select status from public.resolve_player_names(array['cooper FLAGG'])), 'exact', 'casing resolves exactly');
select is((select status from public.resolve_player_names(array['Cooper Flag'])), 'merge', 'one edit away merges');
select is((select player_name from public.resolve_player_names(array['Cooper Flag'])), 'Cooper Flagg', 'merge points to the canonical player');
select is((select status from public.resolve_player_names(array['Testo Playerson III'])), 'suffix', 'suffix-only difference is reviewed, never merged');
select is((select status from public.resolve_player_names(array['Somebody Unknown'])), 'new', 'unknown name is new');

-- Merge: the duplicate's cards move, its name and slugs become aliases, the row disappears.
insert into public.players (slug, name, public_slug) values ('cooper-flag', 'Cooper Flag', 'cooper-flag-cards');
insert into public.cards (slug, set_id, player_id, number, is_rookie)
  select 'test-card-999', (select id from public.card_sets limit 1), (select id from public.players where slug = 'cooper-flag'), '999', false;
select public.merge_players(
  (select id from public.players where slug = 'cooper-flag'),
  (select id from public.players where slug = 'cooper-flagg'), 'test');
select is((select count(*) from public.players where slug = 'cooper-flag'), 0::bigint, 'duplicate deleted');
select is((select p.slug from public.cards c join public.players p on p.id = c.player_id where c.slug = 'test-card-999'), 'cooper-flagg', 'cards moved to the canonical player');
select is((select old_public_slug from public.player_aliases where alias_key = 'cooperflag'), 'cooper-flag-cards', 'old public slug kept for the redirect');

select * from finish();
rollback;
