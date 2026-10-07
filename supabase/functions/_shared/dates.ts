/** US Eastern calendar helpers (duplicated from packages/shared for Deno bundling). */

const easternDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const easternHour = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  hour12: false,
});

export function toEasternDay(date: Date = new Date()): string {
  return easternDay.format(date);
}

export function easternHourOf(date: Date = new Date()): number {
  return Number.parseInt(easternHour.format(date), 10) % 24;
}

export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export function previousEasternDay(date: Date = new Date()): string {
  return addDays(toEasternDay(date), -1);
}

export function isIsoDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** "Tue, Oct 6" for a YYYY-MM-DD Eastern day (same as packages/shared formatEasternDay). */
export function formatEasternDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
