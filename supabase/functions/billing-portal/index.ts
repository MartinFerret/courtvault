/** billing-portal: a Stripe Customer Portal session (manage or cancel) for the signed-in user. */
import { error, json, serve } from '../_shared/http.ts';
import { env } from '../_shared/env.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { stripePost } from '../_shared/stripe.ts';

serve(async (req) => {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  const { user } = await userClient(req);
  const admin = serviceClient();
  const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq(
    'id',
    user.id,
  ).maybeSingle();
  if (!profile?.stripe_customer_id) return error('No web subscription on this account.', 404);
  const appUrl = env('WEB_APP_URL') ?? 'https://vault.hoopticker.com';
  const session = await stripePost<{ url: string }>('/billing_portal/sessions', {
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/tabs/profile`,
  });
  return json({ url: session.url });
});
