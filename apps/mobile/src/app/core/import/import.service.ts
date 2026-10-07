import { Injectable, inject, signal } from '@angular/core';
import type { Database, Grade, Tables } from '@courtvault/shared';
import { SupabaseService } from '../supabase/supabase.service';

/** Fields the catalog match needs. Everything else stays on the row for the user to see. */
export const IMPORT_FIELDS = [
  'player',
  'set',
  'season',
  'number',
  'parallel',
  'grade',
  'serial',
  'price',
  'quantity',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ColumnMapping = Partial<Record<ImportField, string>>;

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export type MatchRow = Database['public']['Functions']['match_import_rows']['Returns'][number];

export interface ImportCandidate {
  /** Index in the parsed rows. */
  index: number;
  raw: Record<string, string>;
  match: MatchRow;
  /** User choices, prefilled from the match and the row. */
  parallelId: string | null;
  grade: Grade;
  serialNumber: number | null;
  purchaseCents: number | null;
  quantity: number;
  /** Rows the user discards are not inserted nor reviewed. */
  action: 'add' | 'review' | 'skip';
}

const HEADER_HINTS: Record<ImportField, RegExp> = {
  player: /player|name|athlete/i,
  set: /\bset\b|product|brand|release/i,
  season: /season|year/i,
  number: /^(card\s*)?(#|no\.?|num(ber)?)$|card\s*#|card number|card no/i,
  parallel: /parallel|variant|variation|refractor|color/i,
  grade: /grade|grading|psa|condition/i,
  serial: /serial|numbered|\/\d+|print run|sn/i,
  price: /price|cost|paid|purchase|bought/i,
  quantity: /qty|quantity|count|copies/i,
};

/**
 * Spreadsheet import: parse in the browser (PapaParse, loaded on demand), map columns, match
 * against the catalog with match_import_rows(), insert with import_collection(). The database
 * enforces the plan limit and keeps the unmatched rows for review.
 */
@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly supabase = inject(SupabaseService);
  readonly reviews = signal<Tables<'import_reviews'>[]>([]);

  async parse(file: File): Promise<ParsedCsv> {
    const Papa = (await import('papaparse')).default;
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
        complete: (result) => {
          const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
          if (headers.length === 0)
            reject(new Error('No header row found. The first line must name the columns.'));
          else resolve({ headers, rows: result.data.slice(0, 2000) });
        },
        error: (err: Error) => reject(err),
      });
    });
  }

  /** Guesses which column holds which field from the header names. */
  autoMap(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    for (const field of IMPORT_FIELDS) {
      const hit = headers.find(
        (h) => HEADER_HINTS[field].test(h) && !Object.values(mapping).includes(h),
      );
      if (hit) mapping[field] = hit;
    }
    return mapping;
  }

  /** The rows as the matcher expects them, plus the local parsing of grade, serial and price. */
  prepare(
    parsed: ParsedCsv,
    mapping: ColumnMapping,
  ): {
    matchInput: Record<string, string>[];
    parsedRows: Pick<ImportCandidate, 'grade' | 'serialNumber' | 'purchaseCents' | 'quantity'>[];
  } {
    const get = (row: Record<string, string>, field: ImportField) =>
      mapping[field] ? (row[mapping[field]!] ?? '').trim() : '';
    const matchInput = parsed.rows.map((row) => ({
      player: get(row, 'player'),
      set: get(row, 'set'),
      season: normalizeSeason(get(row, 'season')),
      number: get(row, 'number'),
      parallel: get(row, 'parallel'),
    }));
    const parsedRows = parsed.rows.map((row) => ({
      grade: parseGrade(get(row, 'grade')),
      serialNumber: parseSerial(get(row, 'serial')) ?? parseSerial(get(row, 'parallel')),
      purchaseCents: parsePrice(get(row, 'price')),
      quantity: Math.min(50, Math.max(1, Number.parseInt(get(row, 'quantity'), 10) || 1)),
    }));
    return { matchInput, parsedRows };
  }

  async match(rows: Record<string, string>[]): Promise<MatchRow[]> {
    const out: MatchRow[] = [];
    // Batches keep each request small; indexes are re-based per batch.
    for (let start = 0; start < rows.length; start += 100) {
      const batch = rows.slice(start, start + 100);
      const { data, error } = await this.supabase.client.rpc('match_import_rows', {
        p_rows: batch,
      });
      if (error) throw error;
      for (const r of data ?? []) out.push({ ...r, row_index: (r.row_index ?? 0) + start });
    }
    return out;
  }

  async confirm(
    candidates: ImportCandidate[],
  ): Promise<{ inserted: number; skipped: number; limitReached: boolean; reviewsSaved: number }> {
    const items = candidates
      .filter((c) => c.action === 'add' && c.parallelId)
      .flatMap((c) =>
        Array.from({ length: c.quantity }, () => ({
          parallel_id: c.parallelId,
          grade: c.grade,
          serial_number: c.serialNumber,
          purchase_cents: c.purchaseCents,
        })),
      );
    // jsonb reorders object keys: keep a readable summary in column order for the review list.
    const reviews = candidates
      .filter((c) => c.action === 'review')
      .map((c) => ({
        raw: { ...c.raw, _summary: summarize(c.raw) },
        reason: c.match.status ?? 'unmatched',
      }));
    const { data, error } = await this.supabase.client.rpc('import_collection', {
      p_items: items,
      p_reviews: reviews,
    });
    if (error) throw error;
    const row = data?.[0];
    return {
      inserted: row?.inserted ?? 0,
      skipped: row?.skipped ?? 0,
      limitReached: row?.limit_reached ?? false,
      reviewsSaved: row?.reviews_saved ?? 0,
    };
  }

  async loadReviews(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('import_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    this.reviews.set(data ?? []);
  }

  async deleteReview(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('import_reviews').delete().eq('id', id);
    if (error) throw error;
    this.reviews.update((list) => list.filter((r) => r.id !== id));
  }
}

export function summarize(raw: Record<string, string>): string {
  return Object.values(raw)
    .filter((v) => typeof v === 'string' && v.trim())
    .slice(0, 6)
    .join(' · ');
}

export function parseGrade(text: string): Grade {
  const t = text.toLowerCase().replace(/\s+/g, '');
  if (/psa\s*10|^10$|gem\s*mint/.test(t)) return 'PSA10';
  if (/psa\s*9|^9$|^mint$/.test(t)) return 'PSA9';
  return 'RAW';
}

export function parseSerial(text: string): number | null {
  const m = /(\d{1,4})\s*\/\s*\d{1,5}/.exec(text);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}

/** "2025", "2025-2026", "25-26" -> "2025-26". */
export function normalizeSeason(text: string): string {
  const m = /(\d{2,4})\s*[-/]\s*(\d{2,4})/.exec(text);
  if (m) {
    const start = m[1]!.length === 2 ? `20${m[1]}` : m[1]!;
    const end = m[2]!.slice(-2);
    return `${start}-${end}`;
  }
  const y = /(20\d{2})/.exec(text);
  if (y) return `${y[1]}-${String(Number(y[1]) + 1).slice(-2)}`;
  return text;
}
