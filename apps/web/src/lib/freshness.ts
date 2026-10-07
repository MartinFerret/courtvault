import 'server-only';
import { toEasternDay } from '@courtvault/shared';
import { supabase } from './supabase';

export interface Freshness {
  prices_updated_at: string | null;
  priced_cards: number;
  latest_game_day: string | null;
  games_last_night: number;
  players_last_night: number;
}

/** What the data actually covers right now. Every field can be empty: callers hide what is. */
export async function getFreshness(): Promise<Freshness | null> {
  const { data, error } = await supabase().rpc('site_freshness');
  if (error) throw error;
  return (data as unknown as Freshness | null) ?? null;
}

/** "6:12 AM ET" in Eastern time. */
export function formatEasternTime(iso: string): string {
  return `${new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))} ET`;
}

/** "today at 6:12 AM ET", "yesterday at ...", or "Oct 6 at ...". */
export function formatEasternWhen(iso: string): string {
  const day = toEasternDay(new Date(iso));
  const today = toEasternDay();
  const yesterday = toEasternDay(new Date(Date.now() - 86_400_000));
  const when =
    day === today
      ? 'today'
      : day === yesterday
        ? 'yesterday'
        : new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            month: 'short',
            day: 'numeric',
          }).format(new Date(iso));
  return `${when} at ${formatEasternTime(iso)}`;
}
