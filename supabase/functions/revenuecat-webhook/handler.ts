/**
 * RevenueCat webhook -> profiles.is_premium / premium_until.
 * Docs: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 * The app user id is the Supabase user id (set in the app on sign-in).
 */

export interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  purchased_at_ms?: number;
  environment?: 'SANDBOX' | 'PRODUCTION';
  product_id?: string;
}

export interface PremiumUpdate {
  userId: string;
  isPremium: boolean;
  premiumUntil: string | null;
}

const GRANTING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'SUBSCRIPTION_EXTENDED',
]);
const REVOKING = new Set(['EXPIRATION', 'SUBSCRIPTION_PAUSED']);
// CANCELLATION keeps access until the expiration date; BILLING_ISSUE too (grace period).
const KEEP_UNTIL_EXPIRY = new Set(['CANCELLATION', 'BILLING_ISSUE']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns the profile update for an event, or null when the event changes nothing. */
export function premiumUpdateFor(
  event: RevenueCatEvent,
  entitlementId = 'premium',
): PremiumUpdate | null {
  const userId = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].find((
    id,
  ) => id && UUID.test(id));
  if (!userId) return null;

  const entitlements = event.entitlement_ids ?? [];
  const concernsPremium = entitlements.length === 0 || entitlements.includes(entitlementId);
  if (!concernsPremium) return null;

  const expiry = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  if (GRANTING.has(event.type)) {
    return { userId, isPremium: true, premiumUntil: expiry };
  }
  if (KEEP_UNTIL_EXPIRY.has(event.type)) {
    // Still premium until expiry; the database's is_premium() checks premium_until.
    return { userId, isPremium: true, premiumUntil: expiry ?? new Date().toISOString() };
  }
  if (REVOKING.has(event.type)) {
    return { userId, isPremium: false, premiumUntil: new Date().toISOString() };
  }
  if (event.type === 'TRANSFER') {
    // Entitlements moved to another app user; revoke here, the new owner gets its own event.
    return { userId, isPremium: false, premiumUntil: new Date().toISOString() };
  }
  return null; // TEST, SUBSCRIBER_ALIAS, etc.
}

export function isAuthorized(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const value = header.replace(/^Bearer\s+/i, '');
  return timingSafeEqual(value, secret) || timingSafeEqual(header, secret);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
