/**
 * Converter for official Topps checklist PDFs (text-based) into our CSV facts.
 *
 * Layout (from `pdftotext -layout`): group headers (BASE, INSERT, AUTOGRAPH, RELIC,
 * AUTOGRAPH RELIC), uppercase section headers, then rows "<number> <player> <team> [Rookie]".
 * Insert and autograph numbers carry prefixes (DD-1, TC-AB, FIN-10).
 *
 * MVP scope: base cards, base variations (same number, different image/border) and rookies.
 * Autographs, relics and inserts are skipped and counted. Only facts are produced: numbers,
 * players, teams, variation names, rookie flags. The PDF itself is never stored.
 */
import { slugify } from '@courtvault/shared';

export interface ParsedRow {
  line: number;
  group: string;
  section: string;
  number: string;
  player: string;
  team: string | null;
  rookie: boolean;
}

export interface Anomaly {
  type:
    | 'unparsable_row'
    | 'non_player_row'
    | 'unknown_team'
    | 'team_alias'
    | 'duplicate_in_section'
    | 'player_mismatch'
    | 'team_mismatch'
    | 'name_variant'
    | 'variation_without_base'
    | 'suspicious_name'
    | 'rookies_inferred';
  number?: string;
  section?: string;
  line?: number;
  message: string;
}

export interface CardOut {
  number: string;
  player: string;
  team: string | null;
  rookie: boolean;
  parallels: string[];
}

export interface ConvertResult {
  cards: CardOut[];
  anomalies: Anomaly[];
  skippedSections: { group: string; section: string; rows: number }[];
  stats: { baseSections: number; variationSections: number; rows: number };
}

export const GROUP_HEADERS = new Set(['BASE', 'INSERT', 'AUTOGRAPH', 'RELIC', 'AUTOGRAPH RELIC']);

/** Current NBA teams plus legacy names that appear on retro cards. */
export const KNOWN_TEAMS = [
  'Atlanta Hawks',
  'Boston Celtics',
  'Brooklyn Nets',
  'Charlotte Hornets',
  'Chicago Bulls',
  'Cleveland Cavaliers',
  'Dallas Mavericks',
  'Denver Nuggets',
  'Detroit Pistons',
  'Golden State Warriors',
  'Houston Rockets',
  'Indiana Pacers',
  'Los Angeles Clippers',
  'Los Angeles Lakers',
  'Memphis Grizzlies',
  'Miami Heat',
  'Milwaukee Bucks',
  'Minnesota Timberwolves',
  'New Orleans Pelicans',
  'New York Knicks',
  'Oklahoma City Thunder',
  'Orlando Magic',
  'Philadelphia 76ers',
  'Phoenix Suns',
  'Portland Trail Blazers',
  'Sacramento Kings',
  'San Antonio Spurs',
  'Toronto Raptors',
  'Utah Jazz',
  'Washington Wizards',
  // legacy
  'Seattle Supersonics',
  'Seattle SuperSonics',
  'New Jersey Nets',
  'Vancouver Grizzlies',
  'Washington Bullets',
  'Charlotte Bobcats',
  'New Orleans Hornets',
  'Kansas City Kings',
  'San Diego Clippers',
  'Buffalo Braves',
  'Philadelphia Warriors',
  'Minneapolis Lakers',
  'St. Louis Hawks',
  'Cincinnati Royals',
  'Syracuse Nationals',
  'Baltimore Bullets',
  'Capital Bullets',
  'Rochester Royals',
  'Fort Wayne Pistons',
  'Chicago Zephyrs',
];
const TEAM_SET = new Set(KNOWN_TEAMS.map((t) => t.toLowerCase()));

/** Known misspellings in Topps files, normalized to the canonical team name (still reported). */
export const TEAM_ALIASES: Record<string, string> = {
  'portland trailblazers': 'Portland Trail Blazers',
  'la clippers': 'Los Angeles Clippers',
  'la lakers': 'Los Angeles Lakers',
  'okc thunder': 'Oklahoma City Thunder',
  'seattle sonics': 'Seattle Supersonics',
};

const SUFFIXES = new Set(['jr.', 'jr', 'sr.', 'sr', 'ii', 'iii', 'iv', 'v']);
const KEEP_UPPER = /^[A-Z]{2}$/; // RJ, OG, AJ, VJ, CJ, PJ, TJ
const INITIALS = /^(?:[A-Z]\.)+[A-Z]?\.?$/; // T.J., P.J., J.R.

/** Normalizes casing and spacing of a player name while keeping accents and suffixes. */
export function normalizePlayerName(raw: string): string {
  const tokens = raw.replace(/\s+/g, ' ').trim().split(' ');
  return tokens
    .map((token) => {
      const lower = token.toLowerCase();
      if (SUFFIXES.has(lower)) {
        if (lower.startsWith('jr')) return 'Jr.';
        if (lower.startsWith('sr')) return 'Sr.';
        return lower.toUpperCase();
      }
      if (KEEP_UPPER.test(token) || INITIALS.test(token)) return token;
      // Hyphenated or apostrophe parts handled independently: Gilgeous-Alexander, D'Angelo, O'Neal
      return token
        .split(/([-'’])/)
        .map((part) => (/[-'’]/.test(part) ? part : normalizeToken(part)))
        .join('');
    })
    .join(' ');
}

function normalizeToken(part: string): string {
  if (!part) return part;
  const hasLower = /\p{Ll}/u.test(part);
  const hasUpper = /\p{Lu}/u.test(part);
  // "LeBRON" -> "LeBron", "DeROZAN" -> "DeRozan": a lowercase run followed by an uppercase run.
  const mixed = /^(\p{Lu}\p{Ll}+)(\p{Lu}{2,})$/u.exec(part);
  if (mixed) return mixed[1]! + capitalize(mixed[2]!.toLowerCase());
  // All caps word ("DEMAR") -> capitalize. Two-letter all caps are kept above.
  if (hasUpper && !hasLower && part.length >= 3) return capitalize(part.toLowerCase());
  // Lowercase word -> capitalize
  if (hasLower && !hasUpper) return capitalize(part);
  return part;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Name without a generational suffix, for fuzzy matching ("P.J. Washington Jr." ~ "P.J. Washington"). */
export function stripSuffix(name: string): string {
  const tokens = name.split(' ');
  while (tokens.length > 1 && SUFFIXES.has(tokens[tokens.length - 1]!.toLowerCase())) tokens.pop();
  return tokens.join(' ');
}

/** Section name -> variation (parallel) name, or null when the section is a plain base list. */
export function variationNameOf(section: string): string | null {
  const s = section.trim();
  if (/^BASE CARDS?( [IVX]+)?$/.test(s) || /^COMBO CARDS$/.test(s)) return null;
  let name = s
    .replace(/^BASE CARDS?( [IVX]+(?=\s|$))?\s*/, '')
    .replace(/^COMBO CARDS\s*/, '')
    .replace(/^BASE\s+/, '')
    .trim();
  if (!name) return null;
  if (/^VARIATIONS?$/.test(name)) name = 'IMAGE VARIATION';
  if (!/VARIATION/.test(name)) name = `${name} VARIATION`;
  return name
    .toLowerCase()
    .replace(/\bvariations\b/, 'variation')
    .split(' ')
    .map(capitalize)
    .join(' ');
}

/**
 * A section is in MVP scope when it lists base cards or their variations. Inside the BASE
 * group every plainly numbered subset is part of the base set: Topps names them "BASE CARDS",
 * "BASE COMMON" / "BASE RARE" (Finest tiers) or by theme ("HIGHLIGHTS", "ALL STARS" in Hoops).
 * Insert groups are never base.
 */
export function isBaseScope(group: string, section: string): boolean {
  if (group !== 'BASE') return false;
  return true;
}

// Numbers: 1, 201, 12a, DD-1, TC-AB, C25-9, 8B-9, FRO-Rk
const ROW_RE = /^\s*([A-Z0-9]{1,6}-[A-Za-z0-9]{1,6}|\d{1,4}[A-Za-z]?)\s+(.+?)\s*$/;
const SECTION_RE = /^\s*([A-Z][A-Z0-9 &/()'.-]{3,})\s*$/;

/** Parses pdftotext -layout output into rows, keeping group and section context. */
export function parseChecklistText(text: string): {
  rows: ParsedRow[];
  anomalies: Anomaly[];
  sections: { group: string; section: string; rows: number }[];
} {
  const rows: ParsedRow[] = [];
  const anomalies: Anomaly[] = [];
  const sections: { group: string; section: string; rows: number }[] = [];
  let group = 'BASE';
  let section = '';
  let current: { group: string; section: string; rows: number } | null = null;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    // pdftotext emits form feeds and non-breaking spaces; treat both as plain whitespace.
    const line = rawLine
      .replace(/\f/g, '')
      .replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\t]/g, ' ')
      .trimEnd();
    if (!line.trim()) return;
    const lineNo = index + 1;

    const trimmed = line.trim();
    if (GROUP_HEADERS.has(trimmed)) {
      group = trimmed;
      return;
    }
    // A line that is only a team name continues the previous row (long names wrap the team).
    const last = rows[rows.length - 1];
    if (last && !last.team && TEAM_SET.has(trimmed.toLowerCase())) {
      last.team = trimmed;
      return;
    }
    if (SECTION_RE.test(trimmed) && !/^\d/.test(trimmed) && !ROW_RE.test(trimmed)) {
      section = trimmed;
      current = { group, section, rows: 0 };
      sections.push(current);
      return;
    }
    const m = ROW_RE.exec(line);
    if (!m) {
      // Only base-group rows matter: insert and autograph rows are out of scope, and the
      // disclaimer lines before the first section are not rows at all. Keep the report short.
      if (group === 'BASE' && section) {
        anomalies.push({
          type: 'unparsable_row',
          section,
          line: lineNo,
          message: `Cannot parse: "${trimmed}"`,
        });
      }
      return;
    }
    const number = m[1]!;
    let rest = m[2]!;
    let rookie = false;
    if (/\s(Rookie|RC)\s*$/.test(rest)) {
      rookie = true;
      rest = rest.replace(/\s(Rookie|RC)\s*$/, '').trim();
    }
    let player: string;
    let team: string | null = null;
    const cols = rest
      .split(/\s{2,}/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length >= 2) {
      player = cols[0]!;
      team = cols.slice(1).join(' ');
    } else {
      // Single-spaced row: find the longest known team at the end.
      player = rest;
      const lower = rest.toLowerCase();
      for (const t of [...KNOWN_TEAMS].sort((a, b) => b.length - a.length)) {
        if (lower.endsWith(' ' + t.toLowerCase())) {
          team = t;
          player = rest.slice(0, rest.length - t.length).trim();
          break;
        }
      }
    }
    if (current) current.rows++;
    rows.push({ line: lineNo, group, section, number, player, team, rookie });
  });
  return { rows, anomalies, sections };
}

/** Builds the card list for one set from parsed rows: base sections define cards, variation sections add parallels. */
export function buildCards(parsed: ReturnType<typeof parseChecklistText>): ConvertResult {
  const anomalies = [...parsed.anomalies];
  const cards = new Map<string, CardOut>();
  const seenNames = new Map<string, Set<string>>(); // slug(stripped) -> spellings
  const skipped: { group: string; section: string; rows: number }[] = [];
  let baseSections = 0;
  let variationSections = 0;

  const inScope = parsed.sections.filter((s) => isBaseScope(s.group, s.section));
  for (const s of parsed.sections) if (!inScope.includes(s)) skipped.push(s);

  // Pass 1: base sections. "BASE CARDS" is always base. Any other BASE-group subset whose
  // numbers are all new (Hoops "HIGHLIGHTS" 261-300, Finest "BASE RARE" 201-300) is base too;
  // a subset that repeats numbers already listed is a variation (Chrome "IMAGE VARIATION").
  const rowsOf = (s: { group: string; section: string }) =>
    parsed.rows.filter((r) => r.group === s.group && r.section === s.section);
  const seenNumbers = new Set<string>();
  const baseOrder: typeof inScope = [];
  const variationOrder: typeof inScope = [];
  for (const s of inScope) {
    const numbers = rowsOf(s).map((r) => r.number);
    const explicitVariation = /VARIATION/i.test(s.section);
    const isBase =
      variationNameOf(s.section) === null ||
      (!explicitVariation && numbers.length > 0 && numbers.every((n) => !seenNumbers.has(n)));
    if (isBase) {
      baseOrder.push(s);
      numbers.forEach((n) => seenNumbers.add(n));
    } else {
      variationOrder.push(s);
    }
  }
  baseSections = baseOrder.length;
  variationSections = variationOrder.length;

  const rowsBySection = new Map<string, ParsedRow[]>();
  for (const r of parsed.rows) {
    const key = `${r.group}|${r.section}`;
    if (!rowsBySection.has(key)) rowsBySection.set(key, []);
    rowsBySection.get(key)!.push(r);
  }

  const checkRow = (r: ParsedRow): boolean => {
    const name = normalizePlayerName(r.player);
    if (
      !/[a-z]/.test(name) ||
      name.split(' ').length < 2 ||
      /\d/.test(name) ||
      (/^[A-Z ]+$/.test(r.player.trim()) && r.player.trim().split(' ').length >= 3)
    ) {
      anomalies.push({
        type: 'non_player_row',
        number: r.number,
        section: r.section,
        line: r.line,
        message: `Not a player row, skipped for the MVP (team cards are not modeled): "${r.player}" (${r.team ?? 'no team'})`,
      });
      return false;
    }
    if (!r.team) {
      anomalies.push({
        type: 'unknown_team',
        number: r.number,
        section: r.section,
        line: r.line,
        message: `No team found for "${r.player}"`,
      });
    } else if (TEAM_ALIASES[r.team.toLowerCase()]) {
      const canonical = TEAM_ALIASES[r.team.toLowerCase()]!;
      anomalies.push({
        type: 'team_alias',
        number: r.number,
        section: r.section,
        line: r.line,
        message: `Team "${r.team}" normalized to "${canonical}" for "${r.player}"`,
      });
      r.team = canonical;
    } else if (!TEAM_SET.has(r.team.toLowerCase())) {
      anomalies.push({
        type: 'unknown_team',
        number: r.number,
        section: r.section,
        line: r.line,
        message: `Unknown team "${r.team}" for "${r.player}"`,
      });
    }
    if (/[A-Z]{3,}/.test(stripSuffix(r.player)) && !/^[A-Z]{2}\b/.test(r.player)) {
      anomalies.push({
        type: 'suspicious_name',
        number: r.number,
        section: r.section,
        line: r.line,
        message: `Odd casing "${r.player}" normalized to "${name}"`,
      });
    }
    return true;
  };

  for (const s of baseOrder) {
    const seen = new Set<string>();
    for (const r of rowsBySection.get(`${s.group}|${s.section}`) ?? []) {
      if (!checkRow(r)) continue;
      const player = normalizePlayerName(r.player);
      if (seen.has(r.number)) {
        anomalies.push({
          type: 'duplicate_in_section',
          number: r.number,
          section: r.section,
          line: r.line,
          message: `Number ${r.number} listed twice in ${r.section}`,
        });
        continue;
      }
      seen.add(r.number);
      const existing = cards.get(r.number);
      if (existing) {
        if (slugify(existing.player) !== slugify(player)) {
          anomalies.push({
            type: 'player_mismatch',
            number: r.number,
            section: r.section,
            line: r.line,
            message: `#${r.number}: "${existing.player}" (first seen) vs "${player}" in ${r.section}`,
          });
        } else if ((existing.team ?? '') !== (r.team ?? '')) {
          anomalies.push({
            type: 'team_mismatch',
            number: r.number,
            section: r.section,
            line: r.line,
            message: `#${r.number} ${player}: "${existing.team}" vs "${r.team}" in ${r.section}`,
          });
        }
        existing.rookie = existing.rookie || r.rookie;
        continue;
      }
      cards.set(r.number, {
        number: r.number,
        player,
        team: r.team,
        rookie: r.rookie,
        parallels: ['Base'],
      });
      const key = slugify(stripSuffix(player));
      if (!seenNames.has(key)) seenNames.set(key, new Set());
      seenNames.get(key)!.add(player);
    }
  }

  // Pass 2: variation sections
  for (const s of variationOrder) {
    const variation = variationNameOf(s.section)!;
    for (const r of rowsBySection.get(`${s.group}|${s.section}`) ?? []) {
      if (!checkRow(r)) continue;
      const player = normalizePlayerName(r.player);
      const card = cards.get(r.number);
      if (!card) {
        anomalies.push({
          type: 'variation_without_base',
          number: r.number,
          section: r.section,
          line: r.line,
          message: `#${r.number} ${player} appears in "${s.section}" but not in a base section`,
        });
        continue;
      }
      if (slugify(stripSuffix(card.player)) !== slugify(stripSuffix(player))) {
        anomalies.push({
          type: 'player_mismatch',
          number: r.number,
          section: r.section,
          line: r.line,
          message: `#${r.number}: base "${card.player}" vs "${player}" in ${s.section}`,
        });
        continue;
      }
      if (slugify(card.player) !== slugify(player)) {
        anomalies.push({
          type: 'name_variant',
          number: r.number,
          section: r.section,
          line: r.line,
          message: `#${r.number}: "${card.player}" vs "${player}" in ${s.section} (kept the base spelling)`,
        });
      }
      if (card.team && r.team && card.team.toLowerCase() !== r.team.toLowerCase()) {
        anomalies.push({
          type: 'team_mismatch',
          number: r.number,
          section: r.section,
          line: r.line,
          message: `#${r.number} ${card.player}: base "${card.team}" vs "${r.team}" in ${s.section} (kept the base team)`,
        });
      }
      if (!card.parallels.includes(variation)) card.parallels.push(variation);
    }
  }

  const sorted = [...cards.values()].sort(
    (a, b) => numberKey(a.number) - numberKey(b.number) || a.number.localeCompare(b.number),
  );
  return {
    cards: sorted,
    anomalies,
    skippedSections: skipped,
    stats: { baseSections, variationSections, rows: parsed.rows.length },
  };
}

function numberKey(n: string): number {
  const m = /(\d+)/.exec(n);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

export interface CsvOptions {
  season: string;
  setSlug: string;
  setName: string;
  /** Numbered parallels applied to every base card, e.g. ["Gold/2025", "Black/68"]. */
  numberedParallels?: string[];
}

export function toCsv(cards: CardOut[], opts: CsvOptions): string {
  const header = 'season,set_slug,set_name,card_number,player_name,team,is_rookie,parallels';
  const lines = cards.map((c) => {
    const parallels = [...c.parallels, ...(opts.numberedParallels ?? [])];
    return [
      opts.season,
      opts.setSlug,
      opts.setName,
      c.number,
      c.player,
      c.team ?? '',
      String(c.rookie),
      parallels.join('|'),
    ]
      .map(csvCell)
      .join(',');
  });
  return [header, ...lines].join('\n') + '\n';
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
