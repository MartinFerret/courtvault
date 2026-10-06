import { assertEquals, assertStringIncludes } from '@std/assert';
import { buildCsv, csvCell, type ExportRow, parseMode } from './csv.ts';

const row = (over: Partial<ExportRow> = {}): ExportRow => ({
  season: '2025-26',
  set_name: 'Topps Chrome',
  card_number: '251',
  player_name: 'Cooper Flagg',
  parallel_name: 'Gold Refractor',
  serial_run: 50,
  serial_number: 12,
  grade: 'PSA10',
  is_rookie: true,
  added_at: '2026-09-20T17:50:11Z',
  purchase_cents: 52000,
  current_cents: 57700,
  change_24h_cents: 300,
  change_30d_cents: -1200,
  gain_cents: 5700,
  ...over,
});

Deno.test('mode parsing defaults to basic', () => {
  assertEquals(parseMode('full'), 'full');
  assertEquals(parseMode('basic'), 'basic');
  assertEquals(parseMode(undefined), 'basic');
  assertEquals(parseMode('premium'), 'basic');
});

Deno.test('csv escaping: accents, commas, quotes, newlines', () => {
  assertEquals(csvCell('Nikola Jokić'), 'Nikola Jokić');
  assertEquals(csvCell('Smith, Jr.'), '"Smith, Jr."');
  assertEquals(csvCell('The "Chef"'), '"The ""Chef"""');
  assertEquals(csvCell('a\nb'), '"a\nb"');
  assertEquals(csvCell(null), '');
  assertEquals(csvCell(0), '0');
});

Deno.test('basic export has no values and no summary', () => {
  const csv = buildCsv([row()], 'basic', new Date('2026-10-06T08:00:00Z'));
  const lines = csv.replace('﻿', '').trim().split('\r\n');
  assertEquals(
    lines[0],
    'season,set,card_number,player,parallel,serial_run,serial_number,grade,rookie,date_added',
  );
  assertEquals(
    lines[1],
    '2025-26,Topps Chrome,251,Cooper Flagg,Gold Refractor,50,12,PSA10,yes,2026-09-20',
  );
  assertEquals(csv.includes('577.00'), false);
  assertEquals(csv.includes('#'), false);
});

Deno.test('full export adds values and a summary header', () => {
  const csv = buildCsv(
    [
      row(),
      row({
        player_name: 'Luka, "The Don"',
        current_cents: 1000,
        purchase_cents: null,
        gain_cents: null,
      }),
    ],
    'full',
    new Date('2026-10-06T08:00:00Z'),
  );
  const lines = csv.replace('﻿', '').trim().split('\r\n');
  assertEquals(lines[0], '# Collection export,2026-10-06T08:00:00.000Z');
  assertEquals(lines[1], '# Cards,2');
  assertEquals(lines[2], '# Total collection value (USD),587.00');
  assertStringIncludes(lines[3]!, 'median asking price of active eBay listings');
  assertEquals(
    lines[5],
    'season,set,card_number,player,parallel,serial_run,serial_number,grade,rookie,date_added,purchase_usd,current_value_usd,change_24h_usd,change_30d_usd,gain_loss_usd',
  );
  assertEquals(
    lines[6],
    '2025-26,Topps Chrome,251,Cooper Flagg,Gold Refractor,50,12,PSA10,yes,2026-09-20,520.00,577.00,3.00,-12.00,57.00',
  );
  assertStringIncludes(lines[7]!, '"Luka, ""The Don"""');
  assertStringIncludes(lines[7]!, ',10.00,3.00,-12.00,');
  assertEquals(lines[7]!.endsWith(','), true); // empty gain when no purchase price
});
