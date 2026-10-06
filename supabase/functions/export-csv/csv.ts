/**
 * Collection CSV export. Two modes:
 * - basic (every signed-in user): identification columns only, no values.
 * - full (Premium): basic + purchase price, current value, 24h and 30-day change, gain/loss,
 *   with a summary header. Enforced server-side: a free user gets LIMIT_REACHED:full_export.
 */
export type ExportMode = 'basic' | 'full';

export interface ExportRow {
  season: string;
  set_name: string;
  card_number: string;
  player_name: string;
  parallel_name: string;
  serial_run: number | null;
  serial_number: number | null;
  grade: string;
  is_rookie: boolean;
  added_at: string;
  purchase_cents: number | null;
  current_cents: number | null;
  change_24h_cents: number | null;
  change_30d_cents: number | null;
  gain_cents: number | null;
}

export const BASIC_COLUMNS = [
  'season',
  'set',
  'card_number',
  'player',
  'parallel',
  'serial_run',
  'serial_number',
  'grade',
  'rookie',
  'date_added',
] as const;
export const FULL_COLUMNS = [
  ...BASIC_COLUMNS,
  'purchase_usd',
  'current_value_usd',
  'change_24h_usd',
  'change_30d_usd',
  'gain_loss_usd',
] as const;

export const VALUATION_METHOD = 'median asking price of active eBay listings';

export function parseMode(value: unknown): ExportMode {
  return value === 'full' ? 'full' : 'basic';
}

/** RFC 4180 cell: quotes when needed, doubles inner quotes. Accents pass through (UTF-8 + BOM). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function usd(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2);
}

export function buildCsv(rows: ExportRow[], mode: ExportMode, exportedAt: Date): string {
  const lines: string[] = [];
  if (mode === 'full') {
    const total = rows.reduce((sum, r) => sum + (r.current_cents ?? 0), 0);
    lines.push(`# Collection export,${csvCell(exportedAt.toISOString())}`);
    lines.push(`# Cards,${rows.length}`);
    lines.push(`# Total collection value (USD),${usd(total)}`);
    lines.push(`# Valuation method,${csvCell(VALUATION_METHOD)}`);
    lines.push('#');
  }
  const columns = mode === 'full' ? FULL_COLUMNS : BASIC_COLUMNS;
  lines.push(columns.join(','));
  for (const r of rows) {
    const basic = [
      r.season,
      r.set_name,
      r.card_number,
      r.player_name,
      r.parallel_name,
      r.serial_run,
      r.serial_number,
      r.grade,
      r.is_rookie ? 'yes' : 'no',
      r.added_at.slice(0, 10),
    ];
    const full = mode === 'full'
      ? [
        usd(r.purchase_cents),
        usd(r.current_cents),
        usd(r.change_24h_cents),
        usd(r.change_30d_cents),
        usd(r.gain_cents),
      ]
      : [];
    lines.push([...basic, ...full].map(csvCell).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
