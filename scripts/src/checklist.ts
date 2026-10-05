import { parse } from 'csv-parse/sync';
import { cardSlug, parseParallel, slugify } from '@courtvault/shared';

export interface ChecklistRow {
  season: string;
  setSlug: string;
  setName: string;
  cardNumber: string;
  playerName: string;
  playerSlug: string;
  cardSlug: string;
  team: string | null;
  isRookie: boolean;
  parallels: { name: string; serialRun: number | null }[];
}

const REQUIRED = ['season', 'set_slug', 'set_name', 'card_number', 'player_name', 'is_rookie', 'parallels'];

/** Parses the checklist CSV format documented in data/checklists/README.md. Throws on bad rows. */
export function parseChecklistCsv(text: string): ChecklistRow[] {
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<
    string,
    string
  >[];
  if (records.length === 0) return [];
  const header = Object.keys(records[0] ?? {});
  for (const col of REQUIRED) {
    if (!header.includes(col)) throw new Error(`Missing column "${col}" (got: ${header.join(', ')})`);
  }
  return records.map((r, i) => {
    const line = i + 2;
    const season = r['season'] ?? '';
    if (!/^20\d\d-\d\d$/.test(season)) throw new Error(`Line ${line}: invalid season "${season}"`);
    const setSlug = r['set_slug'] ?? '';
    if (!setSlug || slugify(setSlug) !== setSlug) throw new Error(`Line ${line}: invalid set_slug "${setSlug}"`);
    const cardNumber = r['card_number'] ?? '';
    if (!cardNumber) throw new Error(`Line ${line}: missing card_number`);
    const playerName = r['player_name'] ?? '';
    if (!playerName) throw new Error(`Line ${line}: missing player_name`);
    const isRookieRaw = (r['is_rookie'] ?? '').toLowerCase();
    if (!['true', 'false'].includes(isRookieRaw)) throw new Error(`Line ${line}: is_rookie must be true or false`);
    const parallels = (r['parallels'] ?? '')
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean)
      .map(parseParallel);
    if (parallels.length === 0) throw new Error(`Line ${line}: at least one parallel is required`);
    const names = new Set(parallels.map((p) => p.name));
    if (names.size !== parallels.length) throw new Error(`Line ${line}: duplicate parallel names`);
    return {
      season,
      setSlug,
      setName: r['set_name'] ?? '',
      cardNumber,
      playerName,
      playerSlug: slugify(playerName),
      cardSlug: cardSlug(setSlug, cardNumber, playerName),
      team: r['team'] ? r['team'] : null,
      isRookie: isRookieRaw === 'true',
      parallels,
    };
  });
}
