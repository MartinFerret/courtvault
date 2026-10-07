import 'server-only';
import { supabase } from './supabase';

export interface FormGame {
  day: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  minutes: number | null;
  pra: number;
}

export interface PlayerForm {
  games: FormGame[];
  season: { games: number; pra_avg: number | null; since: string };
  last5: { games: number; pra_avg: number | null };
  badge: 'hot' | 'cold' | null;
  price: {
    card_slug: string;
    public_slug: string | null;
    card_number: string;
    is_rookie: boolean;
    set_name: string;
    season: string;
    parallel_name: string;
    grade: 'RAW';
    current_cents: number;
    captured_at: string;
    series: { day: string; cents: number | null }[];
  } | null;
}

/** Last games of the player and the value of his reference card on the same dates. */
export async function getPlayerForm(playerId: string, games = 10): Promise<PlayerForm | null> {
  const { data, error } = await supabase().rpc('player_form', {
    p_player_id: playerId,
    p_games: games,
  });
  if (error) throw error;
  return (data as unknown as PlayerForm | null) ?? null;
}
