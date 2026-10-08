import { assertEquals } from '@std/assert';
import { firstTipOff } from './schedule.ts';
import type { GameSummary } from '../_shared/providers/index.ts';

const game = (startsAt: string | null): GameSummary => ({
  externalId: `g-${startsAt}`,
  gameDay: '2026-10-21',
  homeTeam: 'A',
  awayTeam: 'B',
  homeScore: null,
  awayScore: null,
  status: 'scheduled',
  startsAt,
});

Deno.test('first tip-off is the earliest start time of the day', () => {
  const result = firstTipOff([
    game('2026-10-22T02:00:00.000Z'),
    game('2026-10-21T23:00:00.000Z'),
    game(null),
  ]);
  assertEquals(result, { firstTipAt: '2026-10-21T23:00:00.000Z', count: 3 });
});

Deno.test('no games or no start times means no lock', () => {
  assertEquals(firstTipOff([]), { firstTipAt: null, count: 0 });
  assertEquals(firstTipOff([game(null), game('not a date')]), { firstTipAt: null, count: 2 });
});
