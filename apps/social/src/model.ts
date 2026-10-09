import {
  formatCents,
  GRADE_LABELS,
  priceKindLabel,
  toEasternDay,
  type Grade,
} from '@courtvault/shared';

/** Raw rows read from the public database at render time (scripts/duet.mjs). Never invented. */
export type DuetData = {
  card: {
    publicSlug: string;
    number: string;
    player: string;
    set: string;
    season: string;
    isRookie: boolean;
    parallel: string;
    serialRun: number | null;
  };
  prices: {
    grade: Grade;
    price_cents: number;
    price_kind: string | null;
    sale_at: string | null;
    sample_size: number | null;
    captured_at?: string | null;
  }[];
  history: { captured_at: string; price_cents: number }[];
  fetchedAt: string;
};

export type PriceLine = { grade: string; cents: number; price: string; state: string };

const ORDER: Grade[] = ['RAW', 'PSA9', 'PSA10'];

/** One line per grade that has a real price, Raw first, with the site's state label. */
export function priceLines(data: DuetData): PriceLine[] {
  return ORDER.flatMap((g) => {
    const p = data.prices.find((x) => x.grade === g);
    if (!p || p.price_cents === null || p.price_cents === undefined) return [];
    return [
      {
        grade: GRADE_LABELS[g],
        cents: p.price_cents,
        price: formatCents(p.price_cents),
        state: priceKindLabel(p.price_kind, p.sale_at),
      },
    ];
  });
}

/** Minimum number of distinct days before the 30-day sparkline is drawn. */
export const SPARKLINE_MIN_DAYS = 14;

/** Last Raw value of each Eastern day, oldest first. */
export function dailySeries(history: DuetData['history']): { day: string; cents: number }[] {
  const byDay = new Map<string, { at: string; cents: number }>();
  for (const h of history) {
    const day = toEasternDay(new Date(h.captured_at));
    const prev = byDay.get(day);
    if (!prev || prev.at < h.captured_at)
      byDay.set(day, { at: h.captured_at, cents: h.price_cents });
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, cents: v.cents }));
}

/**
 * What fills the chart slot: the sparkline once there are enough days of history, otherwise
 * the evidence behind the Raw figure (how many sales or listings the value comes from).
 */
export function chartSlot(
  data: DuetData,
):
  | { kind: 'sparkline'; series: { day: string; cents: number }[] }
  | { kind: 'evidence'; text: string }
  | { kind: 'none' } {
  const series = dailySeries(data.history);
  if (series.length >= SPARKLINE_MIN_DAYS) return { kind: 'sparkline', series };
  const raw = data.prices.find((p) => p.grade === 'RAW');
  const n = raw?.sample_size ?? 0;
  if (!raw || n <= 0) return { kind: 'none' };
  if (raw.price_kind === 'auction_median')
    return { kind: 'evidence', text: `Raw value: median of ${n} recent eBay auction sales` };
  if (raw.price_kind === 'last_auction')
    return {
      kind: 'evidence',
      text: `Raw value: ${n === 1 ? 'one recent eBay auction sale' : `${n} recent eBay auction sales`}`,
    };
  return { kind: 'evidence', text: `Raw value: median of ${n} current eBay listings` };
}

/** Website frame tier for a parallel (same rule as apps/web/src/components/foil-card.tsx). */
export function webFoilTier(
  parallelName: string,
  serialRun: number | null,
): 'base' | 'refractor' | 'numbered' | 'one' {
  if (serialRun === 1) return 'one';
  if (serialRun !== null) return 'numbered';
  if (parallelName.toLowerCase() === 'base') return 'base';
  return 'refractor';
}

/** Date of the most recent price shown ("Oct 9, 2026", US Eastern), or null when unknown. */
export function dataAsOf(data: DuetData): string | null {
  const latest = data.prices
    .map((p) => p.captured_at ?? '')
    .filter(Boolean)
    .sort()
    .at(-1);
  if (!latest) return null;
  return new Date(latest).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}
