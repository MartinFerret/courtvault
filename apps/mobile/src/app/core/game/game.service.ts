import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from '../analytics/analytics.service';

/** An owned player on the bench, with eligibility for the next lock and recent form. */
export interface RosterPlayer {
  player_id: string;
  name: string;
  slug: string;
  team: string | null;
  is_rookie: boolean;
  eligible: boolean;
  avg_fpts: number | null;
  card: { parallel: string; serial_run: number | null; set: string; number: string } | null;
}

export interface LineupState {
  enabled: boolean;
  today: string;
  next_day: string;
  next_lock_at: string | null;
  next_games: number;
  today_locked: boolean;
  counts: boolean;
  saves_left: number;
  draft: { player_ids: string[]; captain_id: string; updated_at: string } | null;
  locked: {
    game_day: string;
    player_ids: (string | null)[];
    captain_id: string | null;
    locked_at: string;
  } | null;
  roster: RosterPlayer[];
}

export interface PlayerScore {
  slot: number;
  player_id: string | null;
  name: string | null;
  slug: string | null;
  captain: boolean | null;
  played: boolean;
  minutes: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fpts: number;
}

export interface DayScore {
  game_day: string;
  total: number;
  counts: boolean;
  per_player: PlayerScore[] | null;
}

export interface ScoresState {
  premium: boolean;
  limited: boolean;
  days: DayScore[];
}

export interface StandingRow {
  rank: number;
  username: string;
  points: number;
  days: number;
  movement: number | null;
  streak: number;
  is_me: boolean;
}

export interface Standings {
  scope: 'global' | 'league';
  league_id: string | null;
  period: 'week' | 'season';
  key: string;
  current_week: string;
  current_season: string;
  rows: StandingRow[];
  me: StandingRow | null;
  total: number;
}

export interface LeagueSummary {
  id: string;
  name: string;
  role: 'owner' | 'member';
  members: number;
  my_rank: number | null;
}

export interface LeagueMember {
  username: string;
  role: 'owner' | 'member';
  joined_day: string;
  is_me: boolean;
  last_total: number | null;
  last_captain: string | null;
}

export interface LeaguePage {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  my_role: 'owner' | 'member';
  last_day: string | null;
  members: LeagueMember[];
}

export interface Badge {
  kind: 'weekly_winner' | 'perfect_captain' | 'club_200' | 'iron_five';
  scope: 'global' | 'league';
  period_key: string;
  awarded_at: string;
  league: string | null;
}

export interface ScoringWeight {
  stat: string;
  weight: number;
}

/**
 * Vault Score and Leagues. Every rule (eligibility, lock, scoring, standings, limits) is in
 * SQL; this service only calls the RPCs and keeps the last results in signals.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly supabase = inject(SupabaseService);
  private readonly analytics = inject(AnalyticsService);

  readonly lineup = signal<LineupState | null>(null);
  readonly scores = signal<ScoresState | null>(null);
  readonly leagues = signal<LeagueSummary[]>([]);

  private async rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    // Generated types cover these RPCs; the JSON payloads are typed by the interfaces above.
    const { data, error } = await (
      this.supabase.client.rpc as unknown as (
        fn: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: T; error: Error | null }>
    )(name, args);
    if (error) throw error;
    return data;
  }

  async loadLineup(): Promise<LineupState> {
    const state = await this.rpc<LineupState>('my_lineup');
    this.lineup.set(state);
    return state;
  }

  /** Saves the lineup (applies from the next lock). Returns the players eligible only later. */
  async saveLineup(
    playerIds: string[],
    captainId: string,
  ): Promise<{ applies_to: string; pending_player_ids: string[]; saves_left: number }> {
    const result = await this.rpc<{
      applies_to: string;
      pending_player_ids: string[];
      saves_left: number;
    }>('set_lineup', { p_player_ids: playerIds, p_captain_id: captainId });
    const first = !this.lineup()?.draft;
    await this.loadLineup();
    this.analytics.capture(first ? 'first_lineup_saved' : 'lineup_saved', {
      pending: result.pending_player_ids.length,
    });
    return result;
  }

  async loadScores(limit = 30): Promise<ScoresState> {
    const state = await this.rpc<ScoresState>('my_scores', { p_limit: limit });
    this.scores.set(state);
    return state;
  }

  standings(
    scope: 'global' | 'league',
    period: 'week' | 'season',
    leagueId: string | null = null,
    key: string | null = null,
  ): Promise<Standings> {
    return this.rpc<Standings>('standings', {
      p_scope: scope,
      p_league_id: leagueId,
      p_period: period,
      p_key: key,
    });
  }

  async loadLeagues(): Promise<LeagueSummary[]> {
    const list = await this.rpc<LeagueSummary[]>('my_leagues');
    this.leagues.set(list ?? []);
    return list ?? [];
  }

  leaguePage(id: string): Promise<LeaguePage> {
    return this.rpc<LeaguePage>('league_page', { p_league_id: id });
  }

  async createLeague(name: string): Promise<{ id: string; name: string; invite_code: string }> {
    const league = await this.rpc<{ id: string; name: string; invite_code: string }>(
      'create_league',
      { p_name: name },
    );
    await this.loadLeagues();
    return league;
  }

  async joinLeague(code: string): Promise<{ id: string; name: string }> {
    const league = await this.rpc<{ id: string; name: string }>('join_league', {
      p_invite_code: code,
    });
    await this.loadLeagues();
    return league;
  }

  async leaveLeague(id: string): Promise<void> {
    await this.rpc<null>('leave_league', { p_league_id: id });
    await this.loadLeagues();
  }

  regenerateCode(id: string): Promise<string> {
    return this.rpc<string>('regenerate_league_code', { p_league_id: id });
  }

  badges(): Promise<Badge[]> {
    return this.rpc<Badge[]>('my_badges');
  }

  async scoring(): Promise<ScoringWeight[]> {
    const { data, error } = await this.supabase.client
      .from('fantasy_scoring')
      .select('stat, weight, valid_from')
      .order('valid_from', { ascending: false });
    if (error) throw error;
    const seen = new Set<string>();
    return (data ?? [])
      .filter((r) => !seen.has(r.stat) && seen.add(r.stat))
      .map((r) => ({ stat: r.stat, weight: Number(r.weight) }));
  }

  async profile(): Promise<{ username: string | null; ranking_opt_out: boolean }> {
    const uid = this.supabase.userId;
    if (!uid) return { username: null, ranking_opt_out: false };
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('username, ranking_opt_out')
      .eq('id', uid)
      .single();
    if (error) throw error;
    return { username: data.username, ranking_opt_out: data.ranking_opt_out };
  }

  setUsername(username: string): Promise<string> {
    return this.rpc<string>('set_username', { p_username: username });
  }

  setRankingOptOut(optOut: boolean): Promise<boolean> {
    return this.rpc<boolean>('set_ranking_opt_out', { p_opt_out: optOut });
  }
}

/** Human message for the game's SQL error codes (LIMIT_REACHED goes to the paywall instead). */
export function gameErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? '');
  const map: [RegExp, string][] = [
    [/LINEUP_INVALID:size/, 'Pick five players.'],
    [/LINEUP_INVALID:duplicate/, 'Each player can take one spot only.'],
    [/LINEUP_INVALID:captain/, 'Choose a captain among your five players.'],
    [/LINEUP_INVALID:not_owned/, 'You can only field players you own a card of.'],
    [/RATE_LIMITED:lineup/, 'You changed your lineup many times today. Try again tomorrow.'],
    [/USERNAME_INVALID:format/, 'Use 3 to 20 letters, numbers or underscores.'],
    [/USERNAME_INVALID:blocked/, 'Pick another username.'],
    [/USERNAME_TAKEN/, 'That username is taken.'],
    [/LEAGUE_INVALID:name/, 'League names have 3 to 40 characters.'],
    [/LEAGUE_INVALID:blocked/, 'Pick another league name.'],
    [/LEAGUE_NOT_FOUND/, 'No league with that code. Check it with your friend.'],
    [/LEAGUE_FULL/, 'This league is full (50 members).'],
    [/LEAGUE_FORBIDDEN/, 'Only league members can see this.'],
  ];
  for (const [pattern, message] of map) if (pattern.test(text)) return message;
  return text || 'Something went wrong.';
}
