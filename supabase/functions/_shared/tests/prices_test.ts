import { assertEquals, assertStringIncludes } from '@std/assert';
import {
  buildSearchQuery,
  ebaySearchUrl,
  mapEbaySearch,
  MockPriceProvider,
  robustMedianCents,
} from '../providers/prices.ts';

Deno.test('builds a search query from season, set, player, number, parallel and grade', () => {
  const q = buildSearchQuery({
    season: '2025-26',
    setName: 'Topps Chrome',
    playerName: 'Cooper Flagg',
    cardNumber: '3',
    parallelName: 'Gold Refractor',
    serialRun: 50,
    grade: 'PSA10',
  });
  assertStringIncludes(q, '2025-26 Topps Chrome Cooper Flagg #3 Gold Refractor /50 PSA 10');
  const raw = buildSearchQuery({
    season: '2025-26',
    setName: 'Topps Chrome',
    playerName: 'Cooper Flagg',
    cardNumber: '3',
    parallelName: 'Base',
    serialRun: null,
    grade: 'RAW',
  });
  assertEquals(raw.includes('Base'), false);
  assertStringIncludes(raw, '-PSA');
});

Deno.test('robust median drops outliers', () => {
  assertEquals(robustMedianCents([]), null);
  assertEquals(robustMedianCents([1000]), { median: 1000, used: 1 });
  assertEquals(robustMedianCents([1000, 1100, 1200, 1300, 99000]), { median: 1150, used: 4 });
});

Deno.test('maps a recorded eBay Browse response', () => {
  const body = {
    total: 5,
    itemSummaries: [
      {
        itemId: '1',
        price: { value: '45.00', currency: 'USD' },
        itemWebUrl: 'https://ebay.com/itm/1',
      },
      { itemId: '2', price: { value: '52.50', currency: 'USD' } },
      { itemId: '3', price: { value: '48.00', currency: 'USD' } },
      { itemId: '4', price: { value: '999.00', currency: 'USD' } },
      { itemId: '5', price: { value: '40.00', currency: 'EUR' } },
    ],
  };
  const quote = mapEbaySearch(body, 'https://buy');
  assertEquals(quote?.priceCents, 4800);
  assertEquals(quote?.sampleSize, 3);
  assertEquals(quote?.source, 'ebay_asking');
  assertEquals(mapEbaySearch({ itemSummaries: [] }, null), null);
});

Deno.test('affiliate search url', () => {
  assertEquals(ebaySearchUrl('a b', undefined).includes('campid'), false);
  assertStringIncludes(ebaySearchUrl('a b', '123'), 'campid=123');
});

Deno.test('mock prices are deterministic and grade-ordered', async () => {
  const provider = new MockPriceProvider('2026-10-05');
  const base = {
    season: '2025-26',
    setName: 'Topps Chrome',
    playerName: 'Cooper Flagg',
    cardNumber: '3',
    parallelName: 'Base',
    serialRun: null,
  };
  const raw = await provider.quote({ ...base, grade: 'RAW' });
  const psa10 = await provider.quote({ ...base, grade: 'PSA10' });
  assertEquals(raw, await provider.quote({ ...base, grade: 'RAW' }));
  assertEquals((psa10?.priceCents ?? 0) > (raw?.priceCents ?? 0), true);
});
