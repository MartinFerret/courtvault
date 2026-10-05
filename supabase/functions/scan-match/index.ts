/**
 * POST { text } -> ranked card candidates from on-device OCR of a card back.
 * Requires a user session. Reads the public catalog only.
 */
import { error, json, readJson, serve } from '../_shared/http.ts';
import { userClient } from '../_shared/supabase.ts';
import { type CatalogCard, extractSignals, rankCards } from './matcher.ts';

interface Body {
  text?: string;
  limit?: number;
}

serve(async (req) => {
  const { client } = await userClient(req);
  const body = await readJson<Body>(req);
  const text = (body.text ?? '').trim();
  if (!text) return error('text is required', 400);

  const { data: players, error: playersError } = await client.from('players').select(
    'id, name, slug',
  );
  if (playersError) return error(playersError.message, 500);

  const signals = extractSignals(text, players ?? []);
  const playerIds = signals.players.map((p) => p.id);

  // Candidate cards: by matched players, else by card numbers read.
  let query = client
    .from('cards')
    .select(
      'id, slug, number, is_rookie, player_id, set_id, players(name), card_sets(name, slug, season), parallels(id, name, serial_run)',
    );
  if (playerIds.length > 0) {
    query = query.in('player_id', playerIds);
  } else if (signals.numbers.length > 0) {
    query = query.in('number', signals.numbers);
  } else {
    return json({ signals, candidates: [] });
  }
  const { data: rows, error: cardsError } = await query.limit(200);
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

  const candidates = rankCards(signals, cards, Math.min(Math.max(body.limit ?? 5, 1), 10));
  return json({ signals, candidates });
});
