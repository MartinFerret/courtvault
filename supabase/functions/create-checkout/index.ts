/**
 * create-checkout: a hosted Stripe Checkout session for the signed-in user.
 * Body: { plan: 'monthly' | 'yearly' | 'lifetime' }. Returns { url }.
 * Prices come from STRIPE_PRICE_* (ids of the amounts pinned in packages/shared PRICING).
 */
import { error, json, readJson, serve } from '../_shared/http.ts';
import { env, requireEnv } from '../_shared/env.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { stripePost } from '../_shared/stripe.ts';

const TRIAL_DAYS_YEARLY = 7;

serve(async (req) => {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  const { user } = await userClient(req);
  const body = await readJson<{ plan?: string }>(req);
  const plan = body.plan;
  if (plan !== 'monthly' && plan !== 'yearly' && plan !== 'lifetime') {
    return error('Unknown plan', 400);
  }

  const admin = serviceClient();
  const { data: profile } = await admin.from('profiles').select(
    'stripe_customer_id, is_premium, premium_source',
  ).eq('id', user.id).maybeSingle();
  if (profile?.premium_source === 'lifetime') {
    return error('You already have lifetime Premium.', 409);
  }

  if (plan === 'lifetime') {
    const { data: status } = await admin.rpc('founders_lifetime_status');
    if (!status?.[0]?.available) return error("The Founder's Lifetime offer is closed.", 409);
  }

  const appUrl = env('WEB_APP_URL') ?? 'https://vault.hoopfolio.app';
  const price = requireEnv(
    plan === 'monthly'
      ? 'STRIPE_PRICE_MONTHLY'
      : plan === 'yearly'
      ? 'STRIPE_PRICE_YEARLY'
      : 'STRIPE_PRICE_LIFETIME',
  );
  const customer = profile?.stripe_customer_id ?? null;

  const session = await stripePost<{ url: string; id: string }>('/checkout/sessions', {
    mode: plan === 'lifetime' ? 'payment' : 'subscription',
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    ...(customer ? { customer } : { customer_email: user.email }),
    ...(plan !== 'lifetime'
      ? {
        subscription_data: {
          metadata: { user_id: user.id, plan },
          ...(plan === 'yearly' ? { trial_period_days: TRIAL_DAYS_YEARLY } : {}),
        },
      }
      : { payment_intent_data: { metadata: { user_id: user.id, plan } } }),
    allow_promotion_codes: true,
    success_url: `${appUrl}/tabs/profile?checkout=success`,
    cancel_url: `${appUrl}/tabs/profile?checkout=cancel`,
  }, `checkout:${user.id}:${plan}:${Date.now()}`);

  return json({ url: session.url, id: session.id });
});
