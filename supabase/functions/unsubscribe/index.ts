/**
 * One-click unsubscribe (RFC 8058). GET shows a confirmation page, POST (from mail clients'
 * List-Unsubscribe-Post) acts silently. The token identifies the profile; no session needed.
 */
import { error, serve } from '../_shared/http.ts';
import { serviceClient } from '../_shared/supabase.ts';

const SCOPES = new Set(['all', 'digest', 'marketing']);

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const scope = url.searchParams.get('scope') ?? 'all';
  if (!/^[0-9a-f-]{36}$/i.test(token) || !SCOPES.has(scope)) return error('Invalid link', 400);

  const supabase = serviceClient();
  const { data: matched, error: rpcError } = await supabase.rpc('unsubscribe_by_token', {
    p_token: token,
    p_scope: scope,
  });
  if (rpcError) return error(rpcError.message, 500);

  if (req.method === 'POST') {
    return new Response(null, { status: matched ? 200 : 404 });
  }
  const title = matched ? 'You are unsubscribed' : 'This link is no longer valid';
  const body = matched
    ? (scope === 'digest'
      ? 'You will not receive the morning digest anymore. You can turn it back on from your profile.'
      : 'You will not receive these emails anymore.')
    : 'Open your profile in the app to manage your email preferences.';
  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#edeff1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#121417"><div style="max-width:480px;margin:48px auto;background:#f7f8f9;border-radius:24px;padding:32px"><h1 style="margin:0 0 12px;font-size:24px">${title}</h1><p style="margin:0;color:#6a7078">${body}</p></div></body></html>`;
  return new Response(html, {
    status: matched ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
