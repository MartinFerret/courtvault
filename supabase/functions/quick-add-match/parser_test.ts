import { assert, assertEquals } from '@std/assert';
import { type CatalogCard, parseQuery, type QuickPlayer, rankQuickAdd } from './parser.ts';
import catalog from './fixtures/catalog.json' with { type: 'json' };

const players: QuickPlayer[] = catalog.players.map(([id, name]) => ({ id: id!, name: name! }));
const playerName = new Map(players.map((p) => [p.id, p.name]));
const sets = catalog.sets as unknown as Record<
  string,
  { season: string; parallels: [string, number | null][] }
>;
const cards: CatalogCard[] = (catalog.cards as unknown as [string, string, string, boolean][]).map(
  ([playerId, setName, number, isRookie], i) => ({
    id: `c${i}`,
    slug: `c${i}`,
    number,
    isRookie,
    playerId,
    playerName: playerName.get(playerId) ?? '',
    setId: setName,
    setName,
    setSlug: setName,
    season: sets[setName]!.season,
    parallels: sets[setName]!.parallels.map(([name, serialRun], j) => ({
      id: `c${i}-p${j}`,
      name,
      serialRun,
    })),
  }),
);

/** What the edge function does: candidate cards of the matched players, else by number. */
function search(text: string) {
  const signals = parseQuery(text, players);
  const ids = new Set(signals.players.map((p) => p.id));
  const candidates = ids.size > 0
    ? cards.filter((c) => ids.has(c.playerId))
    : cards.filter((c) => signals.numbers.includes(c.number));
  return { signals, matches: rankQuickAdd(signals, candidates, 3) };
}

// 50 realistic inputs, typed like a text to a friend. Expected: set, number, parallel.
const CASES: [string, string, string, string][] = [
  ['2025 Chrome Flagg 251 gold /50', 'Topps Chrome', '251', 'Gold Refractor'],
  ['Cooper Flagg chrome rc 251', 'Topps Chrome', '251', 'Base'],
  ['flagg chrome refractor', 'Topps Chrome', '251', 'Refractor'],
  ['Flagg 251 superfractor 1/1', 'Topps Chrome', '251', 'Superfractor'],
  ['25-26 topps chrome cooper flag #251 orange /25', 'Topps Chrome', '251', 'Orange Refractor'],
  ['Flagg bowman 1', 'Bowman', '1', 'Base'],
  ['flagg hoops rookie', 'Topps Hoops', '35', 'Base'],
  ['Cooper Flagg Topps 201 gold /2025', 'Topps Basketball', '201', 'Gold'],
  ['flagg midnight 61', 'Topps Midnight', '61', 'Base'],
  ['Flagg cosmic chrome', 'Topps Cosmic Chrome', '12', 'Base'],
  ['flagg sapphire 251', 'Topps Chrome Sapphire', '251', 'Base'],
  ['Flagg chrome update 151', 'Topps Chrome Updates', '151', 'Base'],
  ['Wemby chrome 221 refractor', 'Topps Chrome', '221', 'Refractor'],
  ['wembanyamma chrome gold wave /50', 'Topps Chrome', '221', 'Gold Wave Refractor'],
  ['victor wembanyama topps 195 blue rainbow /150', 'Topps Basketball', '195', 'Blue Rainbow'],
  ['SGA chrome 141 green /99', 'Topps Chrome', '141', 'Green Refractor'],
  ['shai gilgeous alexander midnight', 'Topps Midnight', '56', 'Base'],
  ['Jokic chrome 25 purple refractor /75', 'Topps Chrome', '25', 'Purple Refractor'],
  ['joker chrome #25 black /10', 'Topps Chrome', '25', 'Black Refractor'],
  ['Nikola Jokic hoops 82', 'Topps Hoops', '82', 'Base'],
  ['Steph Curry chrome 201', 'Topps Chrome', '201', 'Base'],
  ['stephen curry 2025 chrome red refractor 3/5', 'Topps Chrome', '201', 'Red Refractor'],
  ['Lebron chrome 127 aqua /199', 'Topps Chrome', '127', 'Aqua Refractor'],
  ['lebron james chrome update #1', 'Topps Chrome Updates', '1', 'Base'],
  ['Ant Edwards chrome 151', 'Topps Chrome', '151', 'Base'],
  ['anthony edwards midnight 58', 'Topps Midnight', '58', 'Base'],
  ['Luka cosmic 66', 'Topps Cosmic Chrome', '66', 'Base'],
  ['luka doncic chrome updates 2', 'Topps Chrome Updates', '2', 'Base'],
  ['Dylan Harper chrome rc 252 gold refractor /50', 'Topps Chrome', '252', 'Gold Refractor'],
  ['harper bowman 2', 'Bowman', '2', 'Base'],
  ['Ace Bailey chrome 255 orange wave', 'Topps Chrome', '255', 'Orange Wave Refractor'],
  ['ace bailey topps 205 wood /25', 'Topps Basketball', '205', 'Wood'],
  ['VJ Edgecombe chrome 253 teal /299', 'Topps Chrome', '253', 'Teal Refractor'],
  ['edgecombe bowman 3', 'Bowman', '3', 'Base'],
  ['Kon Knueppel chrome 254 magenta', 'Topps Chrome', '254', 'Magenta Refractor'],
  ['knueppel 254 yellow /275', 'Topps Chrome', '254', 'Yellow Refractor'],
  ['Giannis chrome 137 prism refractor', 'Topps Chrome', '137', 'Prism Refractor'],
  [
    'giannis antetokounmpo 2025-26 topps 54 black rainbow /10',
    'Topps Basketball',
    '54',
    'Black Rainbow',
  ],
  ['Ja Morant chrome 158 negative refractor', 'Topps Chrome', '158', 'Negative Refractor'],
  ['KD chrome 155', 'Topps Chrome', '155', 'Base'],
  ['Chet Holmgren chrome 134 blue wave /150', 'Topps Chrome', '134', 'Blue Wave Refractor'],
  ['paolo banchero chrome 140 green wave 12/99', 'Topps Chrome', '140', 'Green Wave Refractor'],
  ['Cade Cunningham chrome 88 frozenfractor /5', 'Topps Chrome', '88', 'FrozenFractor'],
  ['brunson chrome 101', 'Topps Chrome', '101', 'Base'],
  ['Devin Booker chrome 195 refractor psa 10', 'Topps Chrome', '195', 'Refractor'],
  ['Tyrese Haliburton chrome #3', 'Topps Chrome', '3', 'Base'],
  ['donovan mitchell chrome 69 gold', 'Topps Chrome', '69', 'Gold Refractor'],
  ['Embiid chrome 149 orange refractor', 'Topps Chrome', '149', 'Orange Refractor'],
  ['jayson tatum topps 1 foilfractor 1/1', 'Topps Basketball', '1', 'FoilFractor'],
  ['Trae Young chrome 5 purple wave', 'Topps Chrome', '5', 'Purple Wave Refractor'],
];

Deno.test('quick add parses grade, run, serial and season', () => {
  const s = parseQuery('2025-26 Chrome Flagg #251 gold 12/50 PSA 10', players);
  assertEquals(s.grade, 'PSA10');
  assertEquals(s.run, 50);
  assertEquals(s.serialNumber, 12);
  assertEquals(s.seasons[0]!.season, '2025-26');
  assertEquals(s.numbers, ['251']);
  assertEquals(s.players[0]!.name, 'Cooper Flagg');
});

Deno.test('a parallel word that is also a surname stays a parallel', () => {
  const s = parseQuery('Flagg chrome green /99', players);
  assertEquals(s.players.map((p) => p.name), ['Cooper Flagg']);
  assert(s.parallelWords.includes('green'));
});

Deno.test('quick add match rate on 50 realistic inputs (target: top 3 >= 90%)', () => {
  assertEquals(CASES.length, 50);
  let top1 = 0;
  let top3 = 0;
  const misses: string[] = [];
  for (const [text, set, number, parallel] of CASES) {
    const { matches } = search(text);
    const ok = (i: number) =>
      matches[i] && matches[i]!.card.setName === set && matches[i]!.card.number === number &&
      matches[i]!.parallel.name === parallel;
    if (ok(0)) top1++;
    if (ok(0) || ok(1) || ok(2)) top3++;
    else {
      const got = matches.map((m) => `${m.card.setName} #${m.card.number} ${m.parallel.name}`);
      misses.push(
        `"${text}" -> expected ${set} #${number} ${parallel}; got ${got.join(' | ') || 'nothing'}`,
      );
    }
  }
  console.log(
    `Quick add match rate: top 1 ${top1}/50 (${top1 * 2}%), top 3 ${top3}/50 (${top3 * 2}%)`,
  );
  for (const m of misses) console.log(`  miss: ${m}`);
  assert(top3 >= 45, `top 3 match rate ${top3}/50 is below the 90% target`);
});
