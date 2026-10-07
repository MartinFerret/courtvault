import { formatEasternWhen, type Freshness } from '@/lib/freshness';

/** One line of facts about the data on the page. Empty when there is nothing to say. */
export function FreshnessLine({ data, className }: { data: Freshness | null; className?: string }) {
  if (!data) return null;
  const parts: string[] = [];
  if (data.prices_updated_at && data.priced_cards > 0) {
    parts.push(`Prices updated ${formatEasternWhen(data.prices_updated_at)}.`);
  }
  if (data.latest_game_day && data.games_last_night > 0) {
    parts.push(
      `${data.games_last_night} game${data.games_last_night > 1 ? 's' : ''} tracked last night, ${data.players_last_night} players.`,
    );
  }
  if (parts.length === 0) return null;
  return <p className={`freshness${className ? ` ${className}` : ''}`}>{parts.join(' ')}</p>;
}
