import { describe, expect, it } from 'vitest';
import {
  chartSlot,
  dailySeries,
  dataAsOf,
  priceLines,
  SPARKLINE_MIN_DAYS,
  webFoilTier,
  type DuetData,
} from './model';

const base: DuetData = {
  card: {
    publicSlug: 'x',
    number: '12',
    player: 'P',
    set: 'Set',
    season: '2025-26',
    isRookie: true,
    parallel: 'Base',
    serialRun: null,
  },
  prices: [
    {
      grade: 'PSA10',
      price_cents: 28200,
      price_kind: 'auction_median',
      sale_at: null,
      sample_size: 7,
    },
    {
      grade: 'RAW',
      price_cents: 1350,
      price_kind: 'auction_median',
      sale_at: null,
      sample_size: 12,
    },
  ],
  history: [],
  fetchedAt: '2026-10-09T12:00:00Z',
};

describe('price lines', () => {
  it('keeps Raw, PSA 9, PSA 10 order, skips missing grades and uses the site labels', () => {
    expect(priceLines(base)).toEqual([
      { grade: 'Raw', cents: 1350, price: '$13.50', state: 'Recent auction sales' },
      { grade: 'PSA 10', cents: 28200, price: '$282.00', state: 'Recent auction sales' },
    ]);
  });
  it('dates a last auction sale like the site', () => {
    const d = {
      ...base,
      prices: [
        {
          grade: 'RAW' as const,
          price_cents: 900,
          price_kind: 'last_auction',
          sale_at: '2026-10-02T18:00:00Z',
          sample_size: 1,
        },
      ],
    };
    expect(priceLines(d)[0]?.state).toBe('Last auction sale, Oct 2');
  });
});

describe('chart slot', () => {
  it('shows the evidence while history is short', () => {
    const d = {
      ...base,
      history: [
        { captured_at: '2026-10-08T14:00:00Z', price_cents: 1300 },
        { captured_at: '2026-10-09T14:00:00Z', price_cents: 1350 },
      ],
    };
    expect(chartSlot(d)).toEqual({
      kind: 'evidence',
      text: 'Raw value: median of 12 recent eBay auction sales',
    });
  });
  it('draws the sparkline from one value per Eastern day once there are enough days', () => {
    const history = Array.from({ length: SPARKLINE_MIN_DAYS }, (_, i) => ({
      captured_at: new Date(Date.UTC(2026, 9, 1 + i, 15)).toISOString(),
      price_cents: 1000 + i,
    }));
    history.push({ captured_at: '2026-10-01T20:00:00Z', price_cents: 999 });
    const slot = chartSlot({ ...base, history });
    expect(slot.kind).toBe('sparkline');
    if (slot.kind === 'sparkline') {
      expect(slot.series).toHaveLength(SPARKLINE_MIN_DAYS);
      expect(slot.series[0]).toEqual({ day: '2026-10-01', cents: 999 });
    }
    expect(dailySeries(history)[1]?.cents).toBe(1001);
  });
  it('shows nothing rather than a made-up figure when the sample is unknown', () => {
    expect(
      chartSlot({
        ...base,
        prices: [
          { grade: 'RAW', price_cents: 1, price_kind: 'ask_median', sale_at: null, sample_size: 0 },
        ],
      }),
    ).toEqual({ kind: 'none' });
  });
});

it('uses the website frame tiers', () => {
  expect(webFoilTier('Base', null)).toBe('base');
  expect(webFoilTier('Refractor', null)).toBe('refractor');
  expect(webFoilTier('Gold', 50)).toBe('numbered');
  expect(webFoilTier('Superfractor', 1)).toBe('one');
});

it('dates the data from the latest price, in Eastern time', () => {
  expect(
    dataAsOf({
      ...base,
      prices: [
        {
          grade: 'RAW',
          price_cents: 1,
          price_kind: null,
          sale_at: null,
          sample_size: 1,
          captured_at: '2026-10-09T03:30:00Z',
        },
        {
          grade: 'PSA10',
          price_cents: 2,
          price_kind: null,
          sale_at: null,
          sample_size: 1,
          captured_at: '2026-10-08T12:00:00Z',
        },
      ],
    }),
  ).toBe('Oct 8, 2026');
  expect(dataAsOf(base)).toBeNull();
});
