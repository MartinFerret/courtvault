/** Money is always stored in integer cents. These helpers format it for US users. */

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '—';
  return usd.format(cents / 100);
}

export function formatCentsCompact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '—';
  return Math.abs(cents) < 100_000 ? usd.format(cents / 100) : usdCompact.format(cents / 100);
}

/** Signed change, e.g. "+$12.50" or "-$3.00". */
export function formatCentsDelta(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '—';
  const sign = cents > 0 ? '+' : cents < 0 ? '-' : '';
  return `${sign}${usd.format(Math.abs(cents) / 100)}`;
}

/** Percent change between two cent amounts, rounded to one decimal. Null when the base is 0. */
export function percentChange(fromCents: number, toCents: number): number | null {
  if (!fromCents) return null;
  return Math.round(((toCents - fromCents) / fromCents) * 1000) / 10;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function dollarsToCents(dollars: number | string): number {
  const n = typeof dollars === 'string' ? Number.parseFloat(dollars) : dollars;
  if (!Number.isFinite(n)) throw new Error(`Invalid dollar amount: ${dollars}`);
  return Math.round(n * 100);
}
