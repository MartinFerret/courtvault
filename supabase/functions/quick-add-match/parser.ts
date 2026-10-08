/**
 * Quick add by text: "2025 Chrome Flagg 251 gold /50" -> the card, its parallel, the grade
 * and the serial number. Deterministic (no paid AI): typed text is parsed into signals
 * (player, season, set, card number, parallel words, print run, grade), then every
 * card x parallel of the candidate cards is scored. Typos are tolerated on long name tokens,
 * last names and common nicknames are enough.
 */
import {
  type CatalogCard,
  type CatalogParallel,
  fuzzyEquals,
  normalize,
} from '../scan-match/matcher.ts';

export type { CatalogCard, CatalogParallel };

export interface QuickPlayer {
  id: string;
  name: string;
}

export type Grade = 'RAW' | 'PSA9' | 'PSA10';

export interface QuickSignals {
  players: { id: string; name: string; confidence: number }[];
  /** Seasons with a weight: "2025-26" strong (1), the neighbouring season of a bare year weak (0.4). */
  seasons: { season: string; weight: number }[];
  numbers: string[];
  strongNumber: boolean;
  setWords: string[];
  parallelWords: string[];
  run: number | null;
  serialNumber: number | null;
  grade: Grade;
  rookie: boolean;
}

export interface QuickMatch {
  card: CatalogCard;
  parallel: CatalogParallel;
  grade: Grade;
  serialNumber: number | null;
  score: number;
  reasons: string[];
}

/** Nicknames and short forms collectors type. Values are full player names. */
export const NICKNAMES: Record<string, string> = {
  sga: 'Shai Gilgeous-Alexander',
  shai: 'Shai Gilgeous-Alexander',
  wemby: 'Victor Wembanyama',
  wemb: 'Victor Wembanyama',
  ant: 'Anthony Edwards',
  antman: 'Anthony Edwards',
  bron: 'LeBron James',
  lebron: 'LeBron James',
  kd: 'Kevin Durant',
  steph: 'Stephen Curry',
  chef: 'Stephen Curry',
  giannis: 'Giannis Antetokounmpo',
  greekfreak: 'Giannis Antetokounmpo',
  luka: 'Luka Dončić',
  joker: 'Nikola Jokić',
  jokic: 'Nikola Jokić',
  embiid: 'Joel Embiid',
  dame: 'Damian Lillard',
  cade: 'Cade Cunningham',
  zion: 'Zion Williamson',
  chet: 'Chet Holmgren',
  paolo: 'Paolo Banchero',
  trae: 'Trae Young',
  ja: 'Ja Morant',
  hali: 'Tyrese Haliburton',
  brunson: 'Jalen Brunson',
  vj: 'VJ Edgecombe',
  kon: 'Kon Knueppel',
  cooper: 'Cooper Flagg',
};

/** Set words: each maps to the distinctive tokens of our set names. */
const SET_WORDS: Record<string, string> = {
  chrome: 'chrome',
  sapphire: 'sapphire',
  saph: 'sapphire',
  cosmic: 'cosmic',
  update: 'updates',
  updates: 'updates',
  upd: 'updates',
  finest: 'finest',
  hoops: 'hoops',
  midnight: 'midnight',
  bowman: 'bowman',
  flagship: 'flagship',
  topps: 'topps',
};

/** Parallel vocabulary and aliases (collector shorthand -> our parallel name tokens). */
const PARALLEL_ALIASES: Record<string, string> = {
  ref: 'refractor',
  refr: 'refractor',
  refractors: 'refractor',
  sf: 'superfractor',
  super: 'superfractor',
  prizm: 'prism',
  neg: 'negative',
  frozen: 'frozenfractor',
  foil: 'foil',
  rainbow: 'rainbow',
  wave: 'wave',
  waves: 'wave',
  gold: 'gold',
  golden: 'golden',
  orange: 'orange',
  red: 'red',
  black: 'black',
  blackout: 'blackout',
  green: 'green',
  blue: 'blue',
  purple: 'purple',
  aqua: 'aqua',
  teal: 'teal',
  yellow: 'yellow',
  magenta: 'magenta',
  pink: 'pink',
  silver: 'refractor', // Topps Chrome's base refractor is the "silver"
  wood: 'wood',
  platinum: 'platinum',
  clear: 'clear',
  mirror: 'mirror',
  variation: 'variation',
  var: 'variation',
  sp: 'variation',
  image: 'image',
  negative: 'negative',
  refractor: 'refractor',
  superfractor: 'superfractor',
  foilfractor: 'foilfractor',
  frozenfractor: 'frozenfractor',
  prism: 'prism',
  first: 'first',
};

const COLOR_WORDS = new Set([
  'gold',
  'orange',
  'red',
  'black',
  'green',
  'blue',
  'purple',
  'aqua',
  'teal',
  'yellow',
  'magenta',
  'pink',
  'platinum',
  'wood',
]);

const NOISE = new Set(['card', 'rc', 'rookie', 'the', 'of', 'and', 'nba', 'basketball', 'base']);

function tokensOf(name: string): string[] {
  return normalize(name).split(/[\s-]+/).filter((t) => t.length > 0);
}

/** Season strings for a two-year span starting in `start` (2025 -> "2025-26"). */
function seasonOf(start: number): string {
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function parseQuery(text: string, players: QuickPlayer[]): QuickSignals {
  let norm = normalize(text).replace(/#\s+/g, '#');
  const consumed = new Set<string>();

  // Grade.
  let grade: Grade = 'RAW';
  const psa = /\bpsa\s*(10|9)\b/.exec(norm);
  if (psa) {
    grade = psa[1] === '10' ? 'PSA10' : 'PSA9';
    norm = norm.replace(psa[0], ' ');
  }
  norm = norm.replace(/\braw\b/g, ' ');

  // Seasons: "2025-26", "25-26", "25/26", then a bare year.
  const seasons: QuickSignals['seasons'] = [];
  const full = /\b(20\d{2})\s*[-/]\s*(\d{2})\b/.exec(norm);
  const short = /\b(\d{2})\s*[-/]\s*(\d{2})\b/.exec(norm);
  if (full && (Number(full[1]) + 1) % 100 === Number(full[2])) {
    seasons.push({ season: seasonOf(Number(full[1])), weight: 1 });
    norm = norm.replace(full[0], ' ');
  } else if (short && Number(short[1]) + 1 === Number(short[2]) && Number(short[1]) >= 20) {
    seasons.push({ season: seasonOf(2000 + Number(short[1])), weight: 1 });
    norm = norm.replace(short[0], ' ');
  } else {
    const year = /\b(20[2-3]\d)\b/.exec(norm);
    if (year) {
      const y = Number(year[1]);
      // "2025 Chrome" is the 2025-26 product; "2026" may mean 2025-26 (the year on the box) or 2026-27.
      seasons.push({ season: seasonOf(y), weight: 1 }, { season: seasonOf(y - 1), weight: 0.4 });
      norm = norm.replace(year[0], ' ');
    }
  }

  // Print run and serial number: "12/50", "/50", "#/50", "1/1", "1 of 1".
  let run: number | null = null;
  let serialNumber: number | null = null;
  const numbered = /\b(\d{1,4})\s*(?:\/|of)\s*(\d{1,4})\b/.exec(norm);
  if (numbered && Number(numbered[1]) >= 1 && Number(numbered[1]) <= Number(numbered[2])) {
    serialNumber = Number(numbered[1]);
    run = Number(numbered[2]);
    norm = norm.replace(numbered[0], ' ');
  } else {
    const bare = /(?:^|\s)#?\/\s*(\d{1,4})\b/.exec(norm);
    if (bare) {
      run = Number(bare[1]);
      norm = norm.replace(bare[0], ' ');
    }
  }

  // Card numbers: "#251" / "no 251" strong, then bare 1-3 digit numbers.
  const numbers: string[] = [];
  let strongNumber = false;
  for (const m of norm.matchAll(/(?:#|\bno\.?\s*|\bnumber\s*)([a-z]{0,3}-?\d{1,3}[a-z]?)\b/g)) {
    numbers.push(m[1]!.replace(/^-/, ''));
    strongNumber = true;
  }
  norm = norm.replace(/(?:#|\bno\.?\s*|\bnumber\s*)([a-z]{0,3}-?\d{1,3}[a-z]?)\b/g, ' ');
  for (const m of norm.matchAll(/(?<![\w/])(\d{1,3})(?![\w/])/g)) numbers.push(m[1]!);
  norm = norm.replace(/(?<![\w/])(\d{1,3})(?![\w/])/g, ' ');

  const tokens = norm.split(/[\s-]+/).filter((t) => t.length > 0);
  const rookie = tokens.includes('rc') || tokens.includes('rookie');

  // Players: nicknames first, then last names (typos tolerated), then unique first names.
  const byName = new Map(players.map((p) => [normalize(p.name), p]));
  const found = new Map<
    string,
    { id: string; name: string; confidence: number; tokens: string[] }
  >();
  const add = (p: QuickPlayer, confidence: number, ...used: string[]) => {
    const prev = found.get(p.id);
    if (!prev || prev.confidence < confidence) {
      found.set(p.id, { id: p.id, name: p.name, confidence, tokens: used });
    }
  };
  for (const t of tokens) {
    const nick = NICKNAMES[t];
    if (nick) {
      const p = byName.get(normalize(nick));
      if (p) add(p, 0.9, t);
    }
  }
  const firstNameCount = new Map<string, number>();
  for (const p of players) {
    const first = tokensOf(p.name)[0];
    if (first) firstNameCount.set(first, (firstNameCount.get(first) ?? 0) + 1);
  }
  for (const p of players) {
    const nameTokens = tokensOf(p.name).filter((t) =>
      t.length > 1 && !['jr', 'sr', 'ii', 'iii', 'iv'].includes(t)
    );
    if (nameTokens.length === 0) continue;
    const first = nameTokens[0]!;
    const lastTokens = nameTokens.slice(1);
    const lastHit = tokens.find((t) =>
      lastTokens.some((l) =>
        fuzzyEquals(t, l) || (t.length >= 4 && l.startsWith(t) && t.length >= l.length - 2)
      )
    );
    const firstHit = tokens.find((t) => fuzzyEquals(t, first) || t === first);
    if (lastHit && firstHit) add(p, 1, lastHit, firstHit);
    else if (lastHit) add(p, lastHit.length >= 4 ? 0.8 : 0.5, lastHit);
    else if (firstHit && first.length >= 4 && firstNameCount.get(first) === 1) {
      add(p, 0.6, firstHit);
    }
  }
  // A word that is both a parallel or set word and a surname ("green", "black", "wood") is
  // read as the parallel when another player is recognized without it.
  const isVocabulary = (t: string) => !!PARALLEL_ALIASES[t] || !!SET_WORDS[t];
  let matched = [...found.values()];
  if (matched.some((p) => !p.tokens.every(isVocabulary))) {
    matched = matched.filter((p) => !p.tokens.every(isVocabulary));
  }
  matched.sort((a, b) => b.confidence - a.confidence);
  // Keep the strongest players only (a full name beats someone sharing a first name).
  const best = matched[0]?.confidence ?? 0;
  const kept = matched.filter((p) => p.confidence >= best - 0.25);
  for (const p of kept) for (const t of p.tokens) consumed.add(t);
  const playersOut = kept.map(({ id, name, confidence }) => ({ id, name, confidence }));

  const setWords: string[] = [];
  const parallelWords: string[] = [];
  for (const t of tokens) {
    if (consumed.has(t) || NOISE.has(t)) continue;
    if (SET_WORDS[t]) {
      setWords.push(SET_WORDS[t]!);
      continue;
    }
    const alias = PARALLEL_ALIASES[t];
    if (alias) parallelWords.push(alias);
  }

  return {
    players: playersOut,
    seasons,
    numbers: [...new Set(numbers)],
    strongNumber,
    setWords: [...new Set(setWords)],
    parallelWords: [...new Set(parallelWords)],
    run,
    serialNumber,
    grade,
    rookie,
  };
}

/** Distinctive tokens of a set name: "Topps Chrome Updates" -> chrome, updates. */
function setTokens(setName: string): string[] {
  const t = tokensOf(setName).filter((x) => x !== 'topps' && x !== 'basketball');
  return t.length === 0 ? ['flagship'] : t.map((x) => (x === 'update' ? 'updates' : x));
}

function scoreCard(s: QuickSignals, card: CatalogCard): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const player = s.players.find((p) => p.id === card.playerId);
  if (player) {
    score += 50 * player.confidence;
    reasons.push(`player ${player.name}`);
  } else if (s.players.length > 0) {
    score -= 40;
  }

  if (s.numbers.length > 0) {
    if (s.numbers.some((n) => n.toLowerCase() === card.number.toLowerCase())) {
      score += 30;
      reasons.push(`#${card.number}`);
    } else {
      score -= s.strongNumber ? 25 : 12;
    }
  }

  if (s.seasons.length > 0) {
    const hit = s.seasons.find((x) => x.season === card.season);
    if (hit) {
      score += 15 * hit.weight;
      reasons.push(`season ${card.season}`);
    } else {
      score -= 15;
    }
  }

  const words = s.setWords.filter((w) => w !== 'topps');
  const tokens = setTokens(card.setName);
  if (words.length > 0) {
    const hits = tokens.filter((t) => words.includes(t)).length;
    const extra = words.filter((w) => !tokens.includes(w)).length;
    if (hits > 0) {
      score += 25 * (hits / tokens.length) - 8 * extra;
      reasons.push(`set ${card.setName}`);
    } else {
      score -= 15;
    }
  } else if (s.setWords.includes('topps') && tokens[0] === 'flagship') {
    score += 12; // "Topps Flagg" with no product word: the flagship set
    reasons.push(`set ${card.setName}`);
  }

  if (s.rookie && card.isRookie) score += 5;
  return { score, reasons };
}

function scoreParallel(s: QuickSignals, parallel: CatalogParallel): number {
  let score = 0;
  const nameTokens = tokensOf(parallel.name).map((t) => (t === 'foilboard' ? 'foil' : t));
  if (s.run !== null) {
    if (parallel.serialRun === s.run) score += 20;
    else score -= parallel.serialRun === null ? 14 : 10;
  }
  if (s.parallelWords.length > 0) {
    for (const w of s.parallelWords) {
      if (nameTokens.includes(w)) score += 8;
      else if (COLOR_WORDS.has(w)) score -= 6;
    }
    for (const t of nameTokens) {
      if (COLOR_WORDS.has(t) && !s.parallelWords.includes(t)) score -= 4;
      if (
        ['wave', 'rainbow', 'variation', 'negative', 'prism', 'image', 'mirror'].includes(t) &&
        !s.parallelWords.includes(t)
      ) {
        score -= 3;
      }
    }
  } else if (s.run === null) {
    score += parallel.name === 'Base' ? 6 : -2;
  }
  return score;
}

/**
 * Top matches as card + parallel. The best parallel of each of the best cards first; when
 * fewer cards qualify, the next parallels of the best card fill the list.
 */
export function rankQuickAdd(s: QuickSignals, cards: CatalogCard[], limit = 3): QuickMatch[] {
  const perCard: QuickMatch[][] = [];
  for (const card of cards) {
    const base = scoreCard(s, card);
    if (base.score <= 0) continue;
    const options = card.parallels
      .map((parallel) => ({
        card,
        parallel,
        grade: s.grade,
        serialNumber: s.serialNumber,
        score: base.score + scoreParallel(s, parallel),
        reasons: [...base.reasons, parallel.name],
      }))
      .sort((a, b) => b.score - a.score);
    if (options.length > 0) perCard.push(options);
  }
  perCard.sort((a, b) =>
    b[0]!.score - a[0]!.score || a[0]!.card.setName.localeCompare(b[0]!.card.setName)
  );
  const out: QuickMatch[] = perCard.slice(0, limit).map((o) => o[0]!);
  // Near-tie parallels of the best card are worth showing before weaker cards.
  const bestCard = perCard[0] ?? [];
  for (const alt of bestCard.slice(1)) {
    if (out.length >= limit && alt.score < (out[out.length - 1]?.score ?? 0)) break;
    if (out.some((m) => m.parallel.id === alt.parallel.id)) continue;
    out.push(alt);
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
