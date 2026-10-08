import 'server-only';
import { supabase } from './supabase';

export interface StatLine {
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  minutes: number | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
}

export interface Mover {
  card_slug: string;
  card_number: string;
  is_rookie: boolean;
  player_name: string;
  player_slug: string;
  set_name: string;
  season: string;
  parallel_name: string;
  serial_run: number | null;
  grade: 'RAW' | 'PSA9' | 'PSA10';
  sample_size: number;
  before_cents: number;
  after_cents: number;
  change_cents: number;
  change_pct: number;
  line: StatLine | null;
}

export interface TopCard {
  card_slug: string;
  card_number: string;
  is_rookie: boolean;
  set_name: string;
  season: string;
  parallel_name: string;
  serial_run: number | null;
  grade: 'RAW' | 'PSA9' | 'PSA10';
  after_cents: number;
  change_cents: number | null;
}

export interface Performance extends StatLine {
  player_name: string;
  player_slug: string;
  team: string | null;
  is_rookie: boolean;
  game_score: number;
  top_cards: TopCard[];
}

export interface Game {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

export interface LastNight {
  day: string | null;
  requested_day: string | null;
  latest_day: string | null;
  is_off_day: boolean;
  /** Game day before the regular season start kept in app_settings (official NBA schedule). */
  is_preseason: boolean | null;
  before_at: string;
  after_at: string;
  thresholds: { min_sample_size: number; min_price_cents: number };
  games: Game[];
  gainers: Mover[];
  losers: Mover[];
  performances: Performance[];
}

/** Noise control, configurable per deployment. Defaults: 5 active listings and $5. */
export function lastNightThresholds(): { minSample: number; minPriceCents: number } {
  return {
    minSample: Number(process.env['LAST_NIGHT_MIN_SAMPLE'] ?? 5),
    minPriceCents: Number(process.env['LAST_NIGHT_MIN_PRICE_CENTS'] ?? 500),
  };
}

export async function getLastNight(day?: string): Promise<LastNight | null> {
  const { minSample, minPriceCents } = lastNightThresholds();
  const { data, error } = await supabase().rpc('public_last_night', {
    p_day: day ?? undefined,
    p_min_sample: minSample,
    p_min_price_cents: minPriceCents,
    p_limit: 10,
  });
  if (error) throw error;
  return (data as unknown as LastNight | null) ?? null;
}

export async function listLastNightDays(): Promise<{ game_day: string; games: number }[]> {
  const { data, error } = await supabase().rpc('public_last_night_days', { p_limit: 400 });
  if (error) throw error;
  return data ?? [];
}

/**
 * The performance the homepage features. The rookie with the most points wins when he scored
 * at least 60% of the night's top score, otherwise the top scorer. The same player is not
 * featured two mornings in a row unless he is the night's top scorer outright.
 */
export function pickNotable(
  performances: Performance[],
  previousSlug: string | null,
): Performance | null {
  if (performances.length === 0) return null;
  const byPoints = [...performances].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const top = byPoints[0]!;
  const rookie = byPoints.find((p) => p.is_rookie && (p.points ?? 0) >= 0.6 * (top.points ?? 0));
  const candidate = rookie ?? top;
  if (candidate.player_slug !== previousSlug) return candidate;
  if (candidate.player_slug === top.player_slug && (top.points ?? 0) > (byPoints[1]?.points ?? 0)) {
    return candidate;
  }
  return byPoints.find((p) => p.player_slug !== previousSlug) ?? candidate;
}

/** The top 3 gainers and top 3 losers with their 90-day Base raw history (quote tiles). */
export async function moverSpotlight(
  night: LastNight,
  cardSlugs: Map<string, string>,
): Promise<
  { mover: Mover; history: { captured_at: string; price_cents: number; sample_size: number }[] }[]
> {
  const picks = [...night.gainers.slice(0, 3), ...night.losers.slice(0, 3)];
  return Promise.all(
    picks.map(async (mover) => {
      const slug = cardSlugs.get(mover.card_slug) ?? mover.card_slug;
      // Only the Base raw history exists publicly: other parallels show the tile without a chart.
      if (mover.parallel_name !== 'Base' || mover.grade !== 'RAW') return { mover, history: [] };
      const { data } = await supabase().rpc('public_price_history', {
        p_card_slug: slug,
        p_days: 90,
      });
      return { mover, history: data ?? [] };
    }),
  );
}

/** Slug of the player featured on the previous game night, for the "not twice in a row" rule. */
export interface MoversWindow {
  days: number;
  /** No stat line: the window spans several nights. */
  gainers: Omit<Mover, 'line'>[];
  losers: Omit<Mover, 'line'>[];
  nights: { game_day: string; games: number; lines: number }[];
  priced_cards: number;
}

/** Movers over the last `days` nights and the nights themselves (main trending page). */
export async function getMoversWindow(days = 7): Promise<MoversWindow | null> {
  const { minSample, minPriceCents } = lastNightThresholds();
  const { data, error } = await supabase().rpc('public_movers_window', {
    p_days: days,
    p_min_sample: minSample,
    p_min_price_cents: minPriceCents,
    p_limit: 10,
  });
  if (error) throw error;
  return (data as unknown as MoversWindow | null) ?? null;
}

export async function previousFeaturedSlug(currentDay: string | null): Promise<string | null> {
  if (!currentDay) return null;
  const days = await listLastNightDays().catch(() => []);
  const index = days.findIndex((d) => d.game_day === currentDay);
  const previous = index >= 0 ? days[index + 1] : null;
  if (!previous) return null;
  const night = await getLastNight(previous.game_day).catch(() => null);
  return night ? (pickNotable(night.performances, null)?.player_slug ?? null) : null;
}
