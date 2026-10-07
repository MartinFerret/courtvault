import 'server-only';
import { supabase } from './supabase';

export interface SetSummary {
  id: string;
  slug: string;
  name: string;
  season: string;
  release_date: string | null;
  card_count: number;
}

export async function listSets(): Promise<SetSummary[]> {
  const { data, error } = await supabase()
    .from('card_sets')
    .select('id, slug, name, season, release_date, cards(count)')
    .order('season', { ascending: false })
    .order('name');
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    season: s.season,
    release_date: s.release_date,
    card_count: (s.cards as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getSet(slug: string) {
  const { data, error } = await supabase()
    .from('card_sets')
    .select(
      'id, slug, name, season, release_date, cards(id, slug, number, is_rookie, players(name, slug, team))',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cards = (
    data.cards as unknown as {
      id: string;
      slug: string;
      number: string;
      is_rookie: boolean;
      players: { name: string; slug: string; team: string | null } | null;
    }[]
  )
    .map((c) => ({ ...c, player: c.players }))
    .sort((a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number));
  const base = await basePricesForCards(cards.map((c) => c.id));
  return { ...data, cards: cards.map((c) => ({ ...c, base_cents: base.get(c.id) ?? null })) };
}

export async function listPlayers() {
  const { data, error } = await supabase()
    .from('players')
    .select('id, slug, name, team')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getPlayer(slug: string) {
  const { data, error } = await supabase()
    .from('players')
    .select(
      'id, slug, name, team, cards(id, slug, number, is_rookie, card_sets(name, slug, season))',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cards = (
    data.cards as unknown as {
      id: string;
      slug: string;
      number: string;
      is_rookie: boolean;
      card_sets: { name: string; slug: string; season: string } | null;
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

export async function listCardSlugs(): Promise<{ slug: string; updated: string | null }[]> {
  const { data, error } = await supabase().from('cards').select('slug, created_at');
  if (error) throw error;
  return (data ?? []).map((c) => ({ slug: c.slug, updated: c.created_at }));
}

export interface CardPage {
  id: string;
  slug: string;
  number: string;
  is_rookie: boolean;
  player: { id: string; name: string; slug: string; team: string | null };
  set: { id: string; name: string; slug: string; season: string };
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
  const client = supabase();
  const { data, error } = await client
    .from('cards')
    .select(
      'id, slug, number, is_rookie, players(id, name, slug, team), card_sets(id, name, slug, season), parallels(id, name, serial_run)',
    )
    .eq('slug', slug)
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
