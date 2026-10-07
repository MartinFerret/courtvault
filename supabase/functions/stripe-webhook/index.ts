/** Stripe webhook: the second service-role writer of profiles.is_premium (with RevenueCat). */
import { error, json, serve } from '../_shared/http.ts';
import { requireEnv } from '../_shared/env.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { verifyStripeSignature } from '../_shared/stripe.ts';
import { actionFor, type StripeEvent } from './handler.ts';

serve(async (req) => {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  const raw = await req.text();
  const ok = await verifyStripeSignature(
    raw,
    req.headers.get('stripe-signature'),
    requireEnv('STRIPE_WEBHOOK_SECRET'),
  );
  if (!ok) return error('Invalid signature', 401);

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return error('Invalid JSON', 400);
  }
  if (!event?.id || !event.type) return error('Missing event', 400);

  const supabase = serviceClient();
  // Idempotency: a second delivery of the same event is acknowledged and ignored.
  const { error: dedupError } = await supabase.from('billing_events').insert({
    id: event.id,
    provider: 'stripe',
    type: event.type,
  });
  if (dedupError) {
    if (dedupError.code === '23505') return json({ ok: true, duplicate: true });
    return error(dedupError.message, 500);
  }

  const action = actionFor(event);
  switch (action.kind) {
    case 'ignore':
      return json({ ok: true, ignored: action.reason });
    case 'link_customer': {
      const { error: e } = await supabase.from('profiles').update({
        stripe_customer_id: action.customerId,
      }).eq('id', action.userId);
      if (e) return error(e.message, 500);
      return json({ ok: true, linked: action.userId });
    }
    case 'lifetime': {
      const { data: status } = await supabase.rpc('founders_lifetime_status');
      const open = status?.[0]?.available ?? false;
      const { error: e } = await supabase.rpc('grant_lifetime', {
        p_user_id: action.userId,
        p_platform: 'web',
        p_reference: action.reference,
        p_amount_cents: action.amountCents,
      });
      if (e) return error(e.message, 500);
      if (action.customerId) {
        await supabase.from('profiles').update({ stripe_customer_id: action.customerId }).eq(
          'id',
          action.userId,
        );
      }
      // The cap is checked at checkout creation; a race past it is granted and flagged for review.
      if (!open) {
        console.warn(
          JSON.stringify({
            webhook: 'stripe',
            lifetime: 'sold past the cap',
            userId: action.userId,
          }),
        );
      }
      return json({ ok: true, lifetime: action.userId });
    }
    case 'subscription': {
      let userId = action.userId;
      if (!userId && action.customerId) {
        const { data } = await supabase.from('profiles').select('id').eq(
          'stripe_customer_id',
          action.customerId,
        ).maybeSingle();
        userId = data?.id ?? null;
      }
      if (!userId) return json({ ok: true, ignored: 'unknown customer' });
      // A lifetime buyer never loses Premium because an older subscription lapses.
      const { data: profile } = await supabase.from('profiles').select('premium_source').eq(
        'id',
        userId,
      ).maybeSingle();
      if (profile?.premium_source === 'lifetime') return json({ ok: true, ignored: 'lifetime' });
      const { error: e } = await supabase
        .from('profiles')
        .update({
          is_premium: action.isPremium,
          premium_until: action.premiumUntil,
          premium_source: 'stripe',
          stripe_subscription_id: action.subscriptionId,
          ...(action.customerId ? { stripe_customer_id: action.customerId } : {}),
        })
        .eq('id', userId);
      if (e) return error(e.message, 500);
      await supabase.from('billing_events').update({ user_id: userId }).eq('id', event.id);
      console.log(
        JSON.stringify({
          webhook: 'stripe',
          type: event.type,
          userId,
          isPremium: action.isPremium,
        }),
      );
      return json({ ok: true, userId, isPremium: action.isPremium });
    }
  }
});
