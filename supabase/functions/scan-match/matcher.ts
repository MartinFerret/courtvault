/**
 * Pure OCR-to-card matching. The card back of a modern Topps card usually shows the card
 * number ("No. 3" or "#3"), the season ("2025-26"), the set name, the player name and,
 * for numbered parallels, the serial run ("12/50"). OCR output is noisy: we normalize,
 * tolerate one-character errors in long name tokens and rank candidates by evidence.
 */

export interface CatalogPlayer {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogParallel {
  id: string;
  name: string;
  serialRun: number | null;
}

export interface CatalogCard {
  id: string;
  slug: string;
  number: string;
  isRookie: boolean;
  playerId: string;
  playerName: string;
  setId: string;
  setName: string;
  setSlug: string;
  season: string;
  parallels: CatalogParallel[];
}

export interface ScanSignals {
  numbers: string[];
  season: string | null;
  serial: { number: number; run: number } | null;
  setHints: string[];
  players: { id: string; name: string; confidence: number }[];
}

export interface ScanCandidate {
  card: CatalogCard;
  score: number;
  reasons: string[];
  parallels: CatalogParallel[];
}

export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/#.\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SET_HINTS = [
  'chrome',
  'refractor',
  'finest',
  'stadium club',
  'bowman',
  'basketball',
  'flagship',
  'inception',
];

/** Extracts raw signals (numbers, season, serial run, set hints, player names) from OCR text. */
export function extractSignals(text: string, players: CatalogPlayer[]): ScanSignals {
  const norm = normalize(text);

  const season = /\b(20\d{2})[-–/](\d{2})\b/.exec(norm);
  const seasonValue = season ? `${season[1]}-${season[2]}` : null;

  // Serial run: "12/50", "12 / 50", "1/1". Ignore the season match and dates like 10/05/2026.
  let serial: ScanSignals['serial'] = null;
  for (const m of norm.matchAll(/\b(\d{1,4})\s*\/\s*(\d{1,4})\b(?!\s*\/)/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b >= 1 && b <= 9999 && a >= 1 && a <= b) {
      serial = { number: a, run: b };
      break;
    }
  }

  // Card numbers: explicit markers first ("no. 3", "#3", "card 3"), then bare numbers 1-999.
  const numbers = new Set<string>();
  for (const m of norm.matchAll(/(?:no\.?|#|card|number)\s*([a-z]{0,3}-?\d{1,3}[a-z]?)\b/g)) {
    numbers.add(m[1]!.replace(/^-/, ''));
  }
  const strong = numbers.size > 0;
  if (!strong) {
    for (const m of norm.matchAll(/(?<![\d/.-])(\d{1,3})(?![\d/.-])/g)) {
      const n = Number(m[1]);
      if (n >= 0 && n <= 999 && !(seasonValue && seasonValue.includes(m[1]!))) numbers.add(m[1]!);
    }
  }
  if (serial) {
    numbers.delete(String(serial.number));
    numbers.delete(String(serial.run));
  }

  const setHints = SET_HINTS.filter((hint) => norm.includes(hint));

  // Hyphenated names (Gilgeous-Alexander) match token by token.
  const tokens = norm.split(/[\s-]+/).filter(Boolean);
  const matchedPlayers: ScanSignals['players'] = [];
  for (const player of players) {
    const nameTokens = normalize(player.name).split(/[\s-]+/).filter((t) => t.length > 1);
    if (nameTokens.length === 0) continue;
    const last = nameTokens[nameTokens.length - 1]!;
    const first = nameTokens[0]!;
    const lastHit = tokens.some((t) => fuzzyEquals(t, last));
    const firstHit = nameTokens.length > 1 && tokens.some((t) => fuzzyEquals(t, first));
    if (lastHit && (firstHit || last.length >= 5)) {
      matchedPlayers.push({ id: player.id, name: player.name, confidence: firstHit ? 1 : 0.6 });
    } else if (
      firstHit && first.length >= 5 && last.length >= 5 &&
      tokens.some((t) => t.startsWith(last.slice(0, 4)))
    ) {
      matchedPlayers.push({ id: player.id, name: player.name, confidence: 0.5 });
    }
  }
  matchedPlayers.sort((a, b) => b.confidence - a.confidence);

  return { numbers: [...numbers], season: seasonValue, serial, setHints, players: matchedPlayers };
}

/** Equality tolerant to one OCR error for tokens of 5+ characters. */
export function fuzzyEquals(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  return levenshtein(a, b) <= 1;
}

function levenshtein(a: string, b: string): number {
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

/** Ranks catalog cards against the signals. Parallels are filtered by serial run when one was read. */
export function rankCards(signals: ScanSignals, cards: CatalogCard[], limit = 5): ScanCandidate[] {
  const candidates: ScanCandidate[] = [];
  for (const card of cards) {
    let score = 0;
    const reasons: string[] = [];
    const player = signals.players.find((p) => p.id === card.playerId);
    if (player) {
      score += 50 * player.confidence;
      reasons.push(`player ${player.name}`);
    }
    if (signals.numbers.some((n) => n.toLowerCase() === card.number.toLowerCase())) {
      score += 30;
      reasons.push(`number #${card.number}`);
    }
    if (signals.season && signals.season === card.season) {
      score += 15;
      reasons.push(`season ${card.season}`);
    } else if (signals.season && signals.season !== card.season) {
      score -= 10;
    }
    const setNorm = normalize(card.setName);
    for (const hint of signals.setHints) {
      if (setNorm.includes(hint)) {
        score += 10;
        reasons.push(`set ${card.setName}`);
        break;
      }
    }
    if (score <= 0) continue;

    let parallels = card.parallels;
    if (signals.serial) {
      const run = signals.serial.run;
      const numbered = card.parallels.filter((p) => p.serialRun === run);
      if (numbered.length > 0) {
        parallels = numbered;
        score += 5;
        reasons.push(`serial /${run}`);
      }
    }
    candidates.push({ card, score, reasons, parallels });
  }
  candidates.sort((a, b) => b.score - a.score || a.card.season.localeCompare(b.card.season));
  return candidates.slice(0, limit);
}
