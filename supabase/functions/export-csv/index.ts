/** export-csv: the caller's collection as CSV. mode=basic (free) or mode=full (Premium, enforced here). */
import { corsHeaders, error, readJson, serve } from '../_shared/http.ts';
import { userClient } from '../_shared/supabase.ts';
import { buildCsv, type ExportRow, parseMode } from './csv.ts';

serve(async (req) => {
  const { client, user } = await userClient(req);
  const url = new URL(req.url);
  const body = req.method === 'POST' ? await readJson<{ mode?: string }>(req) : {};
  const mode = parseMode(body.mode ?? url.searchParams.get('mode'));

  if (mode === 'full') {
    const { data: premium, error: premiumError } = await client.rpc('is_premium', { uid: user.id });
    if (premiumError) return error(premiumError.message, 500);
    if (!premium) return error('LIMIT_REACHED:full_export', 402);
  }

  const { data: rows, error: rowsError } = await client.rpc('collection_export');
  if (rowsError) return error(rowsError.message, 500);

  const csv = buildCsv((rows ?? []) as ExportRow[], mode, new Date());
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="collection-${mode}-${stamp}.csv"`,
    },
  });
});
