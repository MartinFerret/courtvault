/** export-csv: Premium only. Returns the caller's collection as a CSV download. */
import { corsHeaders, error, serve } from '../_shared/http.ts';
import { userClient } from '../_shared/supabase.ts';

const COLUMNS = [
  'season',
  'set_name',
  'card_number',
  'player_name',
  'parallel_name',
  'serial_run',
  'serial_number',
  'grade',
  'is_rookie',
  'purchase_usd',
  'current_usd',
  'price_captured_at',
  'added_at',
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

serve(async (req) => {
  const { client, user } = await userClient(req);
  const { data: premium, error: premiumError } = await client.rpc('is_premium', { uid: user.id });
  if (premiumError) return error(premiumError.message, 500);
  if (!premium) return error('LIMIT_REACHED:export', 402);

  const { data: items, error: itemsError } = await client
    .from('collection_items_detailed')
    .select('*')
    .order('created_at', { ascending: true });
  if (itemsError) return error(itemsError.message, 500);

  const lines = [COLUMNS.join(',')];
  for (const it of items ?? []) {
    lines.push(
      [
        it.season,
        it.set_name,
        it.card_number,
        it.player_name,
        it.parallel_name,
        it.serial_run,
        it.serial_number,
        it.grade,
        it.is_rookie,
        it.purchase_cents === null ? '' : (it.purchase_cents / 100).toFixed(2),
        it.current_cents === null ? '' : (it.current_cents / 100).toFixed(2),
        it.price_captured_at,
        it.created_at,
      ].map(csvCell).join(','),
    );
  }
  const body = '﻿' + lines.join('\r\n');
  return new Response(body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="collection-${
        new Date().toISOString().slice(0, 10)
      }.csv"`,
    },
  });
});
