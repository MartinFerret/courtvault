import type { GameSummary } from '../_shared/providers/index.ts';

/**
 * Earliest tip-off among the day's games that have a start time. Games without one are
 * counted but cannot move the lock; a day where no game has a time gets no lock (null).
 */
export function firstTipOff(games: GameSummary[]): { firstTipAt: string | null; count: number } {
  let first: number | null = null;
  for (const game of games) {
    if (!game.startsAt) continue;
    const at = Date.parse(game.startsAt);
    if (Number.isNaN(at)) continue;
    if (first === null || at < first) first = at;
  }
  return { firstTipAt: first === null ? null : new Date(first).toISOString(), count: games.length };
}
