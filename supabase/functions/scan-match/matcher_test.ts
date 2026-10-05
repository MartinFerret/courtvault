import { assertEquals } from '@std/assert';
import { type CatalogCard, type CatalogPlayer, extractSignals, rankCards } from './matcher.ts';

const players: CatalogPlayer[] = [
  { id: 'p-flagg', name: 'Cooper Flagg', slug: 'cooper-flagg' },
  { id: 'p-wemby', name: 'Victor Wembanyama', slug: 'victor-wembanyama' },
  { id: 'p-luka', name: 'Luka Dončić', slug: 'luka-doncic' },
  { id: 'p-harper', name: 'Dylan Harper', slug: 'dylan-harper' },
  { id: 'p-sga', name: 'Shai Gilgeous-Alexander', slug: 'shai-gilgeous-alexander' },
];

const chrome = (id: string, number: string, playerId: string, playerName: string): CatalogCard => ({
  id,
  slug: `2025-26-topps-chrome-${number}`,
  number,
  isRookie: true,
  playerId,
  playerName,
  setId: 's-chrome',
  setName: 'Topps Chrome',
  setSlug: '2025-26-topps-chrome',
  season: '2025-26',
  parallels: [
    { id: `${id}-base`, name: 'Base', serialRun: null },
    { id: `${id}-ref`, name: 'Refractor', serialRun: null },
    { id: `${id}-gold`, name: 'Gold Refractor', serialRun: 50 },
    { id: `${id}-super`, name: 'Superfractor', serialRun: 1 },
  ],
});
const flagship = (
  id: string,
  number: string,
  playerId: string,
  playerName: string,
  season: string,
): CatalogCard => ({
  ...chrome(id, number, playerId, playerName),
  slug: `${season}-topps-basketball-${number}`,
  setId: 's-flag',
  setName: 'Topps Basketball',
  setSlug: `${season}-topps-basketball`,
  season,
  parallels: [{ id: `${id}-base`, name: 'Base', serialRun: null }, {
    id: `${id}-gold`,
    name: 'Gold',
    serialRun: 50,
  }],
});

const cards: CatalogCard[] = [
  chrome('c-flagg-chrome', '3', 'p-flagg', 'Cooper Flagg'),
  chrome('c-wemby-chrome', '1', 'p-wemby', 'Victor Wembanyama'),
  chrome('c-harper-chrome', '2', 'p-harper', 'Dylan Harper'),
  flagship('c-flagg-flag', '1', 'p-flagg', 'Cooper Flagg', '2025-26'),
  flagship('c-flagg-flag-27', '50', 'p-flagg', 'Cooper Flagg', '2026-27'),
  flagship('c-sga-flag', '2', 'p-sga', 'Shai Gilgeous-Alexander', '2025-26'),
];

Deno.test('clean card back: player, number, season and set', () => {
  const text = `2025-26 TOPPS CHROME BASKETBALL
COOPER FLAGG  Dallas Mavericks  Forward
No. 3
© 2026 The Topps Company, Inc.`;
  const signals = extractSignals(text, players);
  assertEquals(signals.season, '2025-26');
  assertEquals(signals.numbers, ['3']);
  assertEquals(signals.players[0]?.id, 'p-flagg');
  const ranked = rankCards(signals, cards);
  assertEquals(ranked[0]?.card.id, 'c-flagg-chrome');
  assertEquals(ranked[0]?.parallels.length, 4);
});

Deno.test('noisy OCR: typos in the name, hash number, stray characters', () => {
  const text = `2O25-26 T0PPS CHR0ME\nC00PER FLAG6 | DALLAS MAVERlCKS\n#3  RC\nPRINTED IN USA`;
  const signals = extractSignals(text, players);
  assertEquals(signals.players[0]?.id, 'p-flagg');
  assertEquals(signals.numbers.includes('3'), true);
  assertEquals(rankCards(signals, cards)[0]?.card.id, 'c-flagg-chrome');
});

Deno.test('serial run filters parallels and is not mistaken for a card number', () => {
  const text = `Topps Chrome 2025-26  Cooper Flagg  No. 3   12/50  Gold`;
  const signals = extractSignals(text, players);
  assertEquals(signals.serial, { number: 12, run: 50 });
  assertEquals(signals.numbers, ['3']);
  const ranked = rankCards(signals, cards);
  assertEquals(ranked[0]?.card.id, 'c-flagg-chrome');
  assertEquals(ranked[0]?.parallels.map((p) => p.name), ['Gold Refractor']);
});

Deno.test('accents and hyphenated names', () => {
  assertEquals(extractSignals('LUKA DONCIC 77', players).players[0]?.id, 'p-luka');
  assertEquals(extractSignals('shai gilgeous alexander no 2', players).players[0]?.id, 'p-sga');
});

Deno.test('season disambiguates between flagship years', () => {
  const s26 = extractSignals('2026-27 Topps Basketball Cooper Flagg No. 50', players);
  assertEquals(rankCards(s26, cards)[0]?.card.id, 'c-flagg-flag-27');
  const s25 = extractSignals('2025-26 Topps Basketball Cooper Flagg No. 1', players);
  assertEquals(rankCards(s25, cards)[0]?.card.id, 'c-flagg-flag');
});

Deno.test('number only: candidates by number across sets', () => {
  const signals = extractSignals('garbled text no. 2 nothing else', players);
  assertEquals(signals.players, []);
  const ranked = rankCards(signals, cards);
  assertEquals(ranked.map((c) => c.card.id).sort(), ['c-harper-chrome', 'c-sga-flag']);
});

Deno.test('unreadable text returns nothing', () => {
  const signals = extractSignals('~~~ ### ...', players);
  assertEquals(rankCards(signals, cards), []);
});
