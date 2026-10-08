/**
 * POST { text } -> the top 3 card + parallel matches for a card typed like a text message
 * ("2025 Chrome Flagg 251 gold /50"). Deterministic parsing (parser.ts), no paid AI.
 * Requires a user session; reads the public catalog only. Adding goes through the app's
 * collection service, so plan limits apply as for any other add.
 */
import { error, json, readJson, serve } from '../_shared/http.ts';
import { userClient } from '../_shared/supabase.ts';
import { type CatalogCard, parseQuery, rankQuickAdd } from './parser.ts';

interface Body {
  text?: string;
}

serve(async (req) => {
  const { client } = await userClient(req);
  const body = await readJson<Body>(req);
  const text = (body.text ?? '').trim().slice(0, 200);
  if (!text) return error('text is required', 400);

  const [{ data: players, error: playersError }, { data: aliases }] = await Promise.all([
    client.from('players').select('id, name'),
    client.from('player_aliases').select('alias, player_id'),
  ]);
  if (playersError) return error(playersError.message, 500);
  // Known alternate spellings count as names of the same player.
  const named = [
    ...(players ?? []),
    ...(aliases ?? []).map((a) => ({ id: a.player_id, name: a.alias })),
  ];

  const signals = parseQuery(text, named);
  const playerIds = [...new Set(signals.players.map((p) => p.id))];

  let query = client
    .from('cards')
    .select(
      'id, slug, number, is_rookie, player_id, set_id, players(name), card_sets(name, slug, season), parallels(id, name, serial_run)',
    );
  if (playerIds.length > 0) query = query.in('player_id', playerIds);
  else if (signals.numbers.length > 0) query = query.in('number', signals.numbers);
  else return json({ signals, matches: [] });
  const { data: rows, error: cardsError } = await query.limit(400);
  if (cardsError) return error(cardsError.message, 500);

  const cards: CatalogCard[] = (rows ?? []).map((row) => {
    const player = row.players as unknown as { name: string } | null;
    const set = row.card_sets as unknown as { name: string; slug: string; season: string } | null;
    const parallels =
      (row.parallels as unknown as { id: string; name: string; serial_run: number | null }[]) ?? [];
    return {
      id: row.id,
      slug: row.slug,
      number: row.number,
      isRookie: row.is_rookie,
      playerId: row.player_id,
      playerName: player?.name ?? '',
      setId: row.set_id,
      setName: set?.name ?? '',
      setSlug: set?.slug ?? '',
      season: set?.season ?? '',
      parallels: parallels.map((p) => ({ id: p.id, name: p.name, serialRun: p.serial_run })),
    };
  });

  const matches = rankQuickAdd(signals, cards, 3).map((m) => ({
    cardId: m.card.id,
    cardSlug: m.card.slug,
    number: m.card.number,
    isRookie: m.card.isRookie,
    playerName: m.card.playerName,
    setName: m.card.setName,
    season: m.card.season,
    parallelId: m.parallel.id,
    parallelName: m.parallel.name,
    serialRun: m.parallel.serialRun,
    grade: m.grade,
    serialNumber: m.serialNumber,
    score: Math.round(m.score),
  }));
  return json({ signals, matches });
});
