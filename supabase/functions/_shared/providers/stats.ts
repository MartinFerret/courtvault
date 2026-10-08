/**
 * StatsProvider: last night's games and box scores.
 * Implementations: Highlightly (real) and Mock (deterministic). Selected by STATS_PROVIDER.
 */
import { HttpError, RetryableError, sleep, withRetry } from '../http.ts';
import { env, requireEnv } from '../env.ts';

export type GameStatus = 'scheduled' | 'live' | 'final';

export interface GameSummary {
  externalId: string;
  gameDay: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  startsAt: string | null;
}

export interface PlayerLine {
  externalPlayerId: number | null;
  playerName: string;
  team: string;
  minutes: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  /** Highlightly "Total Turnovers"; null when the provider does not report it. */
  turnovers: number | null;
  raw: unknown;
}

export interface StatsProvider {
  readonly name: string;
  /** Games played on a US Eastern day (YYYY-MM-DD). */
  gamesForDay(day: string): Promise<GameSummary[]>;
  boxScore(externalId: string): Promise<PlayerLine[]>;
}

export interface KnownPlayer {
  name: string;
  team: string | null;
}

// ---------------------------------------------------------------------------
// Highlightly (https://nba.highlightly.net). Free plan: 100 requests/day, box scores included.
// One night = 1 matches call + 1 box score per game (max 15) = at most 16 requests.
// ---------------------------------------------------------------------------

export interface HighlightlyMatch {
  id: number;
  league?: string;
  date?: string;
  homeTeam?: { id?: number; displayName?: string; name?: string; abbreviation?: string };
  awayTeam?: { id?: number; displayName?: string; name?: string; abbreviation?: string };
  state?: {
    period?: number;
    clock?: number | string;
    description?: string;
    score?: { homeTeam?: number[] | number; awayTeam?: number[] | number };
  };
}

export interface HighlightlyBoxScoreTeam {
  team?: { id?: number; name?: string };
  boxScores?: {
    player?: { id?: number; name?: string; jersey?: number };
    statistics?: { name?: string; value?: number | string }[];
  }[];
}

export function mapHighlightlyMatch(match: HighlightlyMatch, day: string): GameSummary {
  const description = (match.state?.description ?? '').toLowerCase();
  const status: GameStatus = /finish|final|ended|complete/.test(description)
    ? 'final'
    : /not started|scheduled|postponed|tbd/.test(description) || !description
    ? 'scheduled'
    : 'live';
  return {
    externalId: `highlightly-${match.id}`,
    gameDay: day,
    homeTeam: match.homeTeam?.displayName ?? match.homeTeam?.name ?? 'Home',
    awayTeam: match.awayTeam?.displayName ?? match.awayTeam?.name ?? 'Away',
    homeScore: sumScore(match.state?.score?.homeTeam),
    awayScore: sumScore(match.state?.score?.awayTeam),
    status,
    startsAt: match.date ?? null,
  };
}

function sumScore(value: number[] | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.reduce((a, b) => a + (Number(b) || 0), 0);
}

const STAT_PATTERNS: [
  keyof Omit<PlayerLine, 'externalPlayerId' | 'playerName' | 'team' | 'raw'>,
  RegExp,
][] = [
  ['minutes', /minute/i],
  ['points', /point/i],
  ['rebounds', /^(total )?rebound/i],
  ['assists', /assist/i],
  ['steals', /steal/i],
  ['blocks', /block/i],
  ['turnovers', /turnover/i],
];

export function mapHighlightlyBoxScore(teams: HighlightlyBoxScoreTeam[]): PlayerLine[] {
  const lines: PlayerLine[] = [];
  for (const team of teams ?? []) {
    const teamName = team.team?.name ?? '';
    for (const entry of team.boxScores ?? []) {
      const line: PlayerLine = {
        externalPlayerId: entry.player?.id ?? null,
        playerName: entry.player?.name ?? '',
        team: teamName,
        minutes: null,
        points: null,
        rebounds: null,
        assists: null,
        steals: null,
        blocks: null,
        turnovers: null,
        raw: entry,
      };
      for (const stat of entry.statistics ?? []) {
        const name = stat.name ?? '';
        for (const [key, pattern] of STAT_PATTERNS) {
          if (line[key] === null && pattern.test(name)) {
            const value = Number(stat.value);
            line[key] = Number.isFinite(value) ? value : null;
          }
        }
      }
      if (line.playerName) lines.push(line);
    }
  }
  return lines;
}

export class HighlightlyStatsProvider implements StatsProvider {
  readonly name = 'highlightly';
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: { apiKey?: string; baseUrl?: string } = {}) {
    this.apiKey = options.apiKey ?? requireEnv('HIGHLIGHTLY_API_KEY');
    this.baseUrl = options.baseUrl ?? env('HIGHLIGHTLY_BASE_URL') ?? 'https://nba.highlightly.net';
  }

  async gamesForDay(day: string): Promise<GameSummary[]> {
    const params = new URLSearchParams({
      league: 'NBA',
      date: day,
      timezone: 'America/New_York',
      limit: '100',
    });
    const body = await this.get<{ data?: HighlightlyMatch[] }>(`/matches?${params}`);
    return (body.data ?? []).map((m) => mapHighlightlyMatch(m, day));
  }

  async boxScore(externalId: string): Promise<PlayerLine[]> {
    const id = externalId.replace(/^highlightly-/, '');
    const body = await this.get<HighlightlyBoxScoreTeam[]>(`/box-score/${id}`);
    return mapHighlightlyBoxScore(body);
  }

  private get<T>(path: string): Promise<T> {
    return withRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'x-rapidapi-key': this.apiKey, Accept: 'application/json' },
      });
      if (res.status === 429 || res.status >= 500) {
        throw new RetryableError(`Highlightly ${res.status} on ${path}`);
      }
      if (!res.ok) {
        throw new HttpError(`Highlightly ${res.status} on ${path}: ${await res.text()}`, 502);
      }
      return (await res.json()) as T;
    }, { attempts: 3, baseDelayMs: 1000 });
  }
}

// ---------------------------------------------------------------------------
// Mock: deterministic games built from the known players' teams.
// ---------------------------------------------------------------------------

export function hashInt(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export class MockStatsProvider implements StatsProvider {
  readonly name = 'mock';
  constructor(private readonly players: KnownPlayer[]) {}

  gamesForDay(day: string): Promise<GameSummary[]> {
    const teams = [...new Set(this.players.map((p) => p.team).filter((t): t is string => !!t))]
      .sort();
    const games: GameSummary[] = [];
    for (let i = 0; i + 1 < teams.length; i += 2) {
      const home = teams[i]!;
      const away = teams[i + 1]!;
      const seed = hashInt(`${day}:${home}:${away}`);
      games.push({
        externalId: `mock-${day}-${i / 2}`,
        gameDay: day,
        homeTeam: home,
        awayTeam: away,
        homeScore: 95 + (seed % 30),
        awayScore: 95 + ((seed >>> 5) % 30),
        status: 'final',
        startsAt: `${day}T23:30:00.000Z`,
      });
    }
    return Promise.resolve(games);
  }

  async boxScore(externalId: string): Promise<PlayerLine[]> {
    await sleep(0);
    const match = /^mock-(\d{4}-\d{2}-\d{2})-(\d+)$/.exec(externalId);
    if (!match) return [];
    const games = await this.gamesForDay(match[1]!);
    const game = games[Number(match[2])];
    if (!game) return [];
    return this.players
      .filter((p) => p.team === game.homeTeam || p.team === game.awayTeam)
      .map((p) => {
        const seed = hashInt(`${externalId}:${p.name}`);
        // Unsigned shifts: a signed shift of a large hash would yield negative stats.
        return {
          externalPlayerId: null,
          playerName: p.name,
          team: p.team ?? '',
          minutes: 24 + (seed % 14),
          points: 8 + (seed % 28),
          rebounds: 2 + ((seed >>> 3) % 12),
          assists: 1 + ((seed >>> 6) % 10),
          steals: (seed >>> 9) % 4,
          blocks: (seed >>> 11) % 4,
          turnovers: (seed >>> 13) % 5,
          raw: { source: 'mock' },
        };
      });
  }
}
