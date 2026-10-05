/** RevenueCat webhook: the only writer of profiles.is_premium / premium_until. */
import { error, json, readJson, serve } from '../_shared/http.ts';
import { requireEnv } from '../_shared/env.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { isAuthorized, premiumUpdateFor, type RevenueCatEvent } from './handler.ts';

serve(async (req) => {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  if (!isAuthorized(req.headers.get('Authorization'), requireEnv('REVENUECAT_WEBHOOK_SECRET'))) {
    return error('Unauthorized', 401);
  }
  const body = await readJson<{ event?: RevenueCatEvent; api_version?: string }>(req);
  if (!body.event?.type) return error('Missing event', 400);

  const update = premiumUpdateFor(body.event);
  if (!update) return json({ ok: true, ignored: body.event.type });

  const supabase = serviceClient();
  const { error: updateError, count } = await supabase
    .from('profiles')
    .update({ is_premium: update.isPremium, premium_until: update.premiumUntil }, {
      count: 'exact',
    })
    .eq('id', update.userId);
  if (updateError) return error(updateError.message, 500);

  console.log(
    JSON.stringify({ webhook: 'revenuecat', type: body.event.type, ...update, matched: count }),
  );
  return json({
    ok: true,
    type: body.event.type,
    userId: update.userId,
    isPremium: update.isPremium,
    matched: count,
  });
});
