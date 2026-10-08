import { assertEquals } from '@std/assert';
import {
  bulkGroupKey,
  CardSightPriceProvider,
  normalizeName,
  observe,
  recordsOf,
} from '../providers/cardsight.ts';
import {
  callsAllowed,
  callsFor,
  decideMode,
  isFullPassDue,
  planRun,
  reasonAllowed,
} from '../pricing-plan.ts';

const guard = { monthlyQuota: 750, guardSoft: 0.8, guardHard: 0.95, reserveCalls: 10 };

Deno.test('three price states: auction median, last auction, asking median', () => {
  const day = (d: number) => `2026-10-${String(d).padStart(2, '0')}T10:00:00Z`;
  const auctions = [
    { price: 10, date: day(1), listing_type: 'auction' },
    { price: 12, date: day(3), listing_type: 'auction' },
    { price: 11, date: day(2), listing_type: 'auction' },
  ];
  const asks = [
    { price: 20, date: day(5), listing_type: 'fixed' },
    { price: 30, date: day(6), listing_type: 'fixed' },
  ];
  const median = observe([...auctions, ...asks]);
  assertEquals(median?.kind, 'auction_median');
  assertEquals(median?.priceCents, 1100);
  assertEquals(median?.sampleSize, 3);
  assertEquals(median?.saleAt, day(3));

  const last = observe([auctions[0]!, auctions[1]!, ...asks]);
  assertEquals(last?.kind, 'last_auction');
  assertEquals(last?.priceCents, 1200);
  assertEquals(last?.sampleSize, 2);
  assertEquals(last?.saleAt, day(3));

  const ask = observe(asks);
  assertEquals(ask?.kind, 'ask_median');
  assertEquals(ask?.priceCents, 2500);
  assertEquals(ask?.saleAt, null);

  assertEquals(observe([]), null);
  assertEquals(observe([{ price: 0, date: day(1), listing_type: 'fixed' }]), null);
});

Deno.test('records come from the raw section, or every graded section when graded', () => {
  const data = {
    raw: { count: 1, records: [{ price: 1, date: 'd', listing_type: 'fixed' }] },
    graded: [
      {
        company_name: 'PSA',
        grades: [{
          grade_value: '10',
          count: 2,
          records: [{ price: 2, date: 'd', listing_type: 'auction' }, {
            price: 3,
            date: 'd',
            listing_type: 'fixed',
          }],
        }],
      },
    ],
  };
  assertEquals(recordsOf(data, false).length, 1);
  assertEquals(recordsOf(data, true).length, 2);
  assertEquals(recordsOf(undefined, true), []);
});

Deno.test('names match without case, accents or punctuation', () => {
  assertEquals(normalizeName('Gold Refractor'), 'goldrefractor');
  assertEquals(normalizeName('Luka Dončić'), 'lukadoncic');
  assertEquals(normalizeName('Black/Red Refractor'), normalizeName('black red refractor'));
});

Deno.test('the guard picks the mode from the calls already used', () => {
  assertEquals(decideMode(0, guard), 'normal');
  assertEquals(decideMode(599, guard), 'normal');
  assertEquals(decideMode(600, guard), 'essential');
  assertEquals(decideMode(712, guard), 'essential');
  assertEquals(decideMode(713, guard), 'critical');
  assertEquals(callsAllowed(700, guard), 40);
  assertEquals(callsAllowed(745, guard), 0);
  assertEquals(reasonAllowed('rookie', 'essential'), false);
  assertEquals(reasonAllowed('collection', 'essential'), true);
  assertEquals(reasonAllowed('collection', 'critical'), false);
  assertEquals(reasonAllowed('played_last_night', 'critical'), true);
});

Deno.test('a plan keeps last night first, caps cards, then fits the calls', () => {
  const targets = [];
  for (let i = 0; i < 250; i++) {
    targets.push({
      key: `rookie-${i}`,
      cardId: `r${i}`,
      reason: 'rookie',
      cardsightParallelId: null,
      cardsightGradeId: null,
    });
  }
  for (let i = 0; i < 5; i++) {
    targets.push({
      key: `night-${i}`,
      cardId: `n${i}`,
      reason: 'played_last_night',
      cardsightParallelId: null,
      cardsightGradeId: null,
    });
    targets.push({
      key: `night-${i}-psa`,
      cardId: `n${i}`,
      reason: 'played_last_night',
      cardsightParallelId: null,
      cardsightGradeId: 'psa10',
    });
  }
  const plan = planRun(targets, { maxCalls: 100, maxCards: 100 });
  assertEquals(plan.targets[0]!.reason, 'played_last_night');
  assertEquals(new Set(plan.targets.map((t) => t.cardId)).size, 100);
  // 5 night cards (2 targets each) + 95 rookies = 105 targets in 2 groups: 1 + 1 calls.
  assertEquals(plan.targets.length, 105);
  assertEquals(plan.calls, 2);
  assertEquals(plan.dropped, 155);

  const tight = planRun(targets, { maxCalls: 1 });
  assertEquals(tight.calls, 1);
  assertEquals(
    tight.targets.every((t) => t.reason === 'played_last_night' || t.cardsightGradeId === null),
    true,
  );
  assertEquals(callsFor([]), 0);
});

Deno.test('the full pass runs on its weekday once a week', () => {
  // 2026-10-11 is a Sunday.
  assertEquals(isFullPassDue('2026-10-11', 0, null), true);
  assertEquals(isFullPassDue('2026-10-10', 0, null), false);
  assertEquals(isFullPassDue('2026-10-11', 0, '2026-10-04'), true);
  assertEquals(isFullPassDue('2026-10-11', 0, '2026-10-11'), false);
});

Deno.test('bulk requests are grouped per parallel and grade, one call per 100 cards', async () => {
  const bodies: unknown[] = [];
  const fetchImpl = ((_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { card_ids: string[] };
    bodies.push(body);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          meta: { requested: body.card_ids.length, successful: body.card_ids.length, failed: 0 },
          results: body.card_ids.map((id) => ({
            card_id: id,
            success: true,
            data: {
              raw: { count: 1, records: [{ price: 5, date: '2026-10-01', listing_type: 'fixed' }] },
            },
          })),
        }),
        { status: 200 },
      ),
    );
  }) as unknown as typeof fetch;
  const provider = new CardSightPriceProvider({ apiKey: 'test', fetchImpl });
  const requests = [];
  for (let i = 0; i < 150; i++) {
    requests.push({
      key: `b${i}`,
      cardsightCardId: `c${i}`,
      cardsightParallelId: null,
      cardsightGradeId: null,
    });
  }
  requests.push({
    key: 'gold',
    cardsightCardId: 'c0',
    cardsightParallelId: 'gold',
    cardsightGradeId: null,
  });
  const { results, calls } = await provider.quoteMany(requests);
  assertEquals(calls, 3);
  assertEquals(bodies.length, 3);
  assertEquals(results.size, 151);
  assertEquals(results.get('gold')?.kind, 'ask_median');
  assertEquals(bulkGroupKey(requests[150]!), 'gold|raw');
});
