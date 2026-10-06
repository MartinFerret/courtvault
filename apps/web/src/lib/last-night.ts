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
