import 'server-only';
import { supabase } from './supabase';

/** Page size under PostgREST's max_rows (1,000): lists above that size were silently truncated. */
const PAGE = 500;

/** Reads every row of a query that would otherwise stop at max_rows. */
async function fetchAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

const SLUG = /^[a-z0-9-]{1,120}$/;

/** PostgREST `or` filter matching the public slug or the internal one (old links, search results). */
function eitherSlug(slug: string): string | null {
  return SLUG.test(slug) ? `public_slug.eq.${slug},slug.eq.${slug}` : null;
}

/** True once at least one price has been recorded: pages show price columns only then. */
export async function pricesAvailable(): Promise<boolean> {
  const { data, error } = await supabase().from('current_prices').select('parallel_id').limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export interface SetSummary {
  id: string;
  slug: string;
  public_slug: string;
  name: string;
  season: string;
  release_date: string | null;
  card_count: number;
}

export async function listSets(): Promise<SetSummary[]> {
  const { data, error } = await supabase()
    .from('card_sets')
    .select('id, slug, public_slug, name, season, release_date, cards(count)')
    .order('season', { ascending: false })
    .order('name');
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    public_slug: s.public_slug ?? s.slug,
    name: s.name,
    season: s.season,
    release_date: s.release_date,
    card_count: (s.cards as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getSet(slug: string) {
  const filter = eitherSlug(slug);
  if (!filter) return null;
  const { data, error } = await supabase()
    .from('card_sets')
    .select(
      'id, slug, public_slug, name, season, release_date, cards(id, slug, public_slug, number, is_rookie, players(name, slug, public_slug, team))',
    )
    .or(filter)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cards = (
    data.cards as unknown as {
      id: string;
      slug: string;
      public_slug: string;
      number: string;
      is_rookie: boolean;
      players: { name: string; slug: string; public_slug: string; team: string | null } | null;
    }[]
  )
    .map((c) => ({ ...c, player: c.players }))
    .sort((a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number));
  const base = await basePricesForCards(cards.map((c) => c.id));
  return {
    ...data,
    public_slug: data.public_slug ?? data.slug,
    cards: cards.map((c) => ({
      ...c,
      public_slug: c.public_slug ?? c.slug,
      base_cents: base.get(c.id) ?? null,
    })),
  };
}

export async function listPlayers() {
  return fetchAll((from, to) =>
    supabase()
      .from('players')
      .select('id, slug, public_slug, name, team')
      .order('name')
      .range(from, to),
  );
}

export async function getPlayer(slug: string) {
  const filter = eitherSlug(slug);
  if (!filter) return null;
  const { data, error } = await supabase()
    .from('players')
    .select(
      'id, slug, public_slug, name, team, cards(id, slug, public_slug, number, is_rookie, card_sets(name, slug, public_slug, season))',
    )
    .or(filter)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cards = (
    data.cards as unknown as {
      id: string;
      slug: string;
      public_slug: string;
      number: string;
      is_rookie: boolean;
      card_sets: { name: string; slug: string; public_slug: string; season: string } | null;
    }[]
  )
    .map((c) => ({ ...c, set: c.card_sets }))
    .sort(
      (a, b) =>
        (b.set?.season ?? '').localeCompare(a.set?.season ?? '') ||
        Number(a.number) - Number(b.number),
    );
  const base = await basePricesForCards(cards.map((c) => c.id));
  const lines = await recentLines(data.id);
  return {
    ...data,
    cards: cards.map((c) => ({ ...c, base_cents: base.get(c.id) ?? null })),
    lines,
  };
}

/** Public slug of the canonical player when `slug` belongs to a merged duplicate (301 target). */
export async function playerAliasTarget(slug: string): Promise<string | null> {
  if (!SLUG.test(slug)) return null;
  const { data, error } = await supabase()
    .from('player_aliases')
    .select('players(slug, public_slug)')
    .or(`old_public_slug.eq.${slug},old_slug.eq.${slug}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const player = data?.players as unknown as { slug: string; public_slug: string | null } | null;
  return player ? (player.public_slug ?? player.slug) : null;
}

export async function listCardSlugs(): Promise<{ slug: string; updated: string | null }[]> {
  const rows = await fetchAll((from, to) =>
    supabase().from('cards').select('public_slug, created_at').order('id').range(from, to),
  );
  return rows
    .map((c) => ({ slug: c.public_slug ?? '', updated: c.created_at }))
    .filter((c) => c.slug);
}

/** Internal card slug -> public slug, for lists that only carry the internal one (movers, rankings). */
export async function cardPublicSlugMap(): Promise<Map<string, string>> {
  const rows = await fetchAll((from, to) =>
    supabase().from('cards').select('slug, public_slug').order('id').range(from, to),
  );
  return new Map(rows.map((c) => [c.slug, c.public_slug ?? c.slug]));
}

/** Internal player slug -> public slug. */
export async function playerPublicSlugMap(): Promise<Map<string, string>> {
  const rows = await fetchAll((from, to) =>
    supabase().from('players').select('slug, public_slug').order('id').range(from, to),
  );
  return new Map(rows.map((p) => [p.slug, p.public_slug ?? p.slug]));
}

export type PageKind = 'checklist' | 'player' | 'card';

/** Quality gate for one page (sitemap and robots meta). Unknown pages are not indexable. */
export async function indexStatus(
  kind: PageKind,
  publicSlug: string,
): Promise<{ indexable: boolean; lastmod: string | null }> {
  const { data } = await supabase()
    .from('page_index_status')
    .select('indexable, lastmod')
    .eq('kind', kind)
    .eq('public_slug', publicSlug)
    .maybeSingle();
  return { indexable: data?.indexable ?? false, lastmod: data?.lastmod ?? null };
}

/** Every indexable page of a kind with its real lastmod (R49, R50). */
export async function listIndexable(
  kind: PageKind,
): Promise<{ slug: string; lastmod: string | null }[]> {
  const rows = await fetchAll((from, to) =>
    supabase()
      .from('page_index_status')
      .select('public_slug, lastmod')
      .eq('kind', kind)
      .eq('indexable', true)
      .order('public_slug')
      .range(from, to),
  );
  return rows
    .filter((r) => r.public_slug)
    .map((r) => ({ slug: r.public_slug as string, lastmod: r.lastmod }));
}

export interface CardPage {
  id: string;
  slug: string;
  number: string;
  is_rookie: boolean;
  public_slug: string;
  player: { id: string; name: string; slug: string; public_slug: string; team: string | null };
  set: { id: string; name: string; slug: string; public_slug: string; season: string };
  parallels: {
    id: string;
    name: string;
    serial_run: number | null;
    prices: {
      grade: 'RAW' | 'PSA9' | 'PSA10';
      price_cents: number;
      sample_size: number;
      captured_at: string;
      buy_url: string | null;
    }[];
  }[];
}

export async function getCard(slug: string): Promise<CardPage | null> {
  const filter = eitherSlug(slug);
  if (!filter) return null;
  const client = supabase();
  const { data, error } = await client
    .from('cards')
    .select(
      'id, slug, public_slug, number, is_rookie, players(id, name, slug, public_slug, team), card_sets(id, name, slug, public_slug, season), parallels(id, name, serial_run)',
    )
    .or(filter)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const player = data.players as unknown as CardPage['player'] | null;
  const set = data.card_sets as unknown as CardPage['set'] | null;
  const parallels =
    (data.parallels as unknown as { id: string; name: string; serial_run: number | null }[]) ?? [];
  if (!player || !set) return null;
  const { data: prices, error: pricesError } = await client
    .from('latest_prices')
    .select('parallel_id, grade, price_cents, sample_size, captured_at, buy_url')
    .in(
      'parallel_id',
      parallels.map((p) => p.id),
    );
  if (pricesError) throw pricesError;
  const byParallel = new Map<string, CardPage['parallels'][number]['prices']>();
  for (const p of prices ?? []) {
    if (!p.parallel_id || !p.grade || p.price_cents === null) continue;
    const list = byParallel.get(p.parallel_id) ?? [];
    list.push({
      grade: p.grade,
      price_cents: p.price_cents,
      sample_size: p.sample_size ?? 0,
      captured_at: p.captured_at ?? '',
      buy_url: p.buy_url,
    });
    byParallel.set(p.parallel_id, list);
  }
  const order = { RAW: 0, PSA9: 1, PSA10: 2 } as const;
  return {
    id: data.id,
    slug: data.slug,
    public_slug: data.public_slug ?? data.slug,
    number: data.number,
    is_rookie: data.is_rookie,
    player,
    set,
    parallels: parallels
      .map((p) => ({
        ...p,
        prices: (byParallel.get(p.id) ?? []).sort((a, b) => order[a.grade] - order[b.grade]),
      }))
      .sort(
        (a, b) =>
          (a.serial_run ?? Number.MAX_SAFE_INTEGER) - (b.serial_run ?? Number.MAX_SAFE_INTEGER) ||
          (a.name === 'Base' ? -1 : 0),
      ),
  };
}

export async function rookieRankings(limit = 20) {
  const { data, error } = await supabase().rpc('rookie_rankings', { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function searchCatalog(q: string) {
  const { data, error } = await supabase().rpc('search_catalog', { q, p_limit: 20 });
  if (error) throw error;
  return data ?? [];
}

/** RAW Base price per card, for list pages. */
async function basePricesForCards(cardIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (cardIds.length === 0) return result;
  const client = supabase();
  // PostgREST filters travel in the URL: keep `in` lists short (a set has 300 cards).
  const cardByParallel = new Map<string, string>();
  for (const ids of chunk(cardIds, 80)) {
    const { data: parallels, error } = await client
      .from('parallels')
      .select('id, card_id')
      .in('card_id', ids)
      .eq('name', 'Base');
    if (error) throw error;
    for (const p of parallels ?? []) cardByParallel.set(p.id, p.card_id);
  }
  for (const ids of chunk([...cardByParallel.keys()], 80)) {
    const { data: prices, error: pricesError } = await client
      .from('latest_prices')
      .select('parallel_id, price_cents')
      .eq('grade', 'RAW')
      .in('parallel_id', ids);
    if (pricesError) throw pricesError;
    for (const p of prices ?? []) {
      const cardId = p.parallel_id ? cardByParallel.get(p.parallel_id) : undefined;
      if (cardId && p.price_cents !== null) result.set(cardId, p.price_cents);
    }
  }
  return result;
}

async function recentLines(playerId: string) {
  const { data, error } = await supabase()
    .from('player_game_lines')
    .select(
      'points, rebounds, assists, steals, blocks, minutes, games(game_day, home_team, away_team, home_score, away_score)',
    )
    .eq('player_id', playerId)
    .limit(10);
  if (error) throw error;
  return (data ?? [])
    .map((l) => ({
      ...l,
      game: l.games as unknown as {
        game_day: string;
        home_team: string;
        away_team: string;
        home_score: number | null;
        away_score: number | null;
      } | null,
    }))
    .sort((a, b) => (b.game?.game_day ?? '').localeCompare(a.game?.game_day ?? ''))
    .slice(0, 5);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
