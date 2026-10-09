/** Game days use the US Eastern calendar day, matching how the NBA schedules nights. */
const easternDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Returns `YYYY-MM-DD` for the given instant in America/New_York. */
export function toEasternDay(date: Date = new Date()): string {
  return easternDay.format(date);
}

/** The Eastern day before the given instant: "last night" from the morning's perspective. */
export function previousEasternDay(date: Date = new Date()): string {
  const day = toEasternDay(date);
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return prev.toISOString().slice(0, 10);
}

export function formatEasternDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Honest label for the night a page shows: "Last night" only when it is the previous Eastern
 * day. Before the 5 AM Eastern update, or after a night without games, the latest night on
 * file is older: "Latest game night".
 */
export function nightLabel(
  day: string,
  now: Date = new Date(),
): { label: string; isLastNight: boolean } {
  const isLastNight = day === previousEasternDay(now);
  return { label: isLastNight ? 'Last night' : 'Latest game night', isLastNight };
}
