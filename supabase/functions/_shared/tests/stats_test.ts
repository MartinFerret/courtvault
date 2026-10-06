import { assertEquals } from '@std/assert';
import {
  mapHighlightlyBoxScore,
  mapHighlightlyMatch,
  MockStatsProvider,
} from '../providers/stats.ts';

// Recorded from the Highlightly documentation examples (GET /matches, GET /box-score/{id}).
const MATCH = {
  id: 5294,
  league: 'NBA',
  season: 2024,
  date: '2024-04-07T01:00:00.000Z',
  homeTeam: { id: 3, displayName: 'Denver Nuggets', name: 'Nuggets', abbreviation: 'DEN' },
  awayTeam: {
    id: 41,
    displayName: 'Minnesota Timberwolves',
    name: 'Timberwolves',
    abbreviation: 'MIN',
  },
  state: {
    period: 4,
    clock: 0,
    description: 'Finished',
    score: { homeTeam: [30, 28, 25, 29], awayTeam: [25, 27, 30, 26] },
  },
};

const BOX_SCORE = [
  {
    team: { id: 32, name: 'Sacramento Kings' },
    boxScores: [
      {
        player: { id: 99737, name: 'Harrison Barnes', jersey: 0 },
        statistics: [
          { name: 'Total Minutes Played', value: 29 },
          { name: 'Total Points Scored', value: 17 },
          { name: 'Total Rebounds', value: 6 },
          { name: 'Offensive Rebounds', value: 2 },
          { name: 'Total Assists', value: 3 },
          { name: 'Total Steals', value: 1 },
          { name: 'Total Blocks', value: 0 },
        ],
      },
    ],
  },
  {
    team: { id: 3, name: 'Denver Nuggets' },
    boxScores: [{
      player: { id: 1, name: 'Nikola Jokić' },
      statistics: [{ name: 'Total Points Scored', value: '31' }],
    }],
  },
];

Deno.test('maps a Highlightly match to a game summary', () => {
  const game = mapHighlightlyMatch(MATCH, '2024-04-06');
  assertEquals(game.externalId, 'highlightly-5294');
  assertEquals(game.gameDay, '2024-04-06');
  assertEquals(game.homeTeam, 'Denver Nuggets');
  assertEquals(game.awayTeam, 'Minnesota Timberwolves');
  assertEquals(game.homeScore, 112);
  assertEquals(game.awayScore, 108);
  assertEquals(game.status, 'final');
});

Deno.test('maps match states', () => {
  assertEquals(
    mapHighlightlyMatch({ ...MATCH, state: { description: 'Not started' } }, '2024-04-06').status,
    'scheduled',
  );
  assertEquals(
    mapHighlightlyMatch({ ...MATCH, state: { description: '3rd Quarter' } }, '2024-04-06').status,
    'live',
  );
  assertEquals(mapHighlightlyMatch({ id: 1 }, '2024-04-06').status, 'scheduled');
});

Deno.test('maps a Highlightly box score to player lines', () => {
  const lines = mapHighlightlyBoxScore(BOX_SCORE);
  assertEquals(lines.length, 2);
  const barnes = lines[0]!;
  assertEquals(barnes.externalPlayerId, 99737);
  assertEquals(barnes.team, 'Sacramento Kings');
  assertEquals(barnes.minutes, 29);
  assertEquals(barnes.points, 17);
  assertEquals(barnes.rebounds, 6);
  assertEquals(barnes.assists, 3);
  assertEquals(barnes.steals, 1);
  assertEquals(barnes.blocks, 0);
  const jokic = lines[1]!;
  assertEquals(jokic.points, 31);
  assertEquals(jokic.rebounds, null);
});

Deno.test('mock provider is deterministic and pairs known teams', async () => {
  const players = [
    { name: 'Cooper Flagg', team: 'Dallas Mavericks' },
    { name: 'Victor Wembanyama', team: 'San Antonio Spurs' },
    { name: 'Stephen Curry', team: 'Golden State Warriors' },
  ];
  const provider = new MockStatsProvider(players);
  const games = await provider.gamesForDay('2026-10-04');
  assertEquals(games.length, 1);
  const lines = await provider.boxScore(games[0]!.externalId);
  assertEquals(lines.length, 2);
  const again = await provider.boxScore(games[0]!.externalId);
  assertEquals(lines, again);
  for (const line of lines) {
    for (
      const v of [line.points, line.rebounds, line.assists, line.steals, line.blocks, line.minutes]
    ) {
      assertEquals((v ?? 0) >= 0, true, 'mock stats are never negative');
    }
  }
});
