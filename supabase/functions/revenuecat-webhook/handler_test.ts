import { assertEquals } from '@std/assert';
import { isAuthorized, premiumUpdateFor } from './handler.ts';

const uid = '00000000-0000-0000-0000-000000000001';
const expiry = Date.UTC(2027, 0, 1);

Deno.test('purchase and renewal grant premium until expiry', () => {
  for (const type of ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']) {
    const u = premiumUpdateFor({
      type,
      app_user_id: uid,
      entitlement_ids: ['premium'],
      expiration_at_ms: expiry,
    });
    assertEquals(u, { userId: uid, isPremium: true, premiumUntil: new Date(expiry).toISOString() });
  }
});

Deno.test('cancellation keeps premium until expiry', () => {
  const u = premiumUpdateFor({
    type: 'CANCELLATION',
    app_user_id: uid,
    entitlement_ids: ['premium'],
    expiration_at_ms: expiry,
  });
  assertEquals(u?.isPremium, true);
  assertEquals(u?.premiumUntil, new Date(expiry).toISOString());
});

Deno.test('expiration revokes premium', () => {
  const u = premiumUpdateFor({
    type: 'EXPIRATION',
    app_user_id: uid,
    entitlement_ids: ['premium'],
    expiration_at_ms: expiry,
  });
  assertEquals(u?.isPremium, false);
});

Deno.test('ignores other entitlements, non-uuid ids and TEST events', () => {
  assertEquals(
    premiumUpdateFor({ type: 'RENEWAL', app_user_id: uid, entitlement_ids: ['other'] }),
    null,
  );
  assertEquals(premiumUpdateFor({ type: 'RENEWAL', app_user_id: '$RCAnonymousID:abc' }), null);
  assertEquals(premiumUpdateFor({ type: 'TEST', app_user_id: uid }), null);
  // Anonymous id with a uuid alias still resolves.
  assertEquals(
    premiumUpdateFor({ type: 'RENEWAL', app_user_id: '$RCAnonymousID:abc', aliases: [uid] })
      ?.userId,
    uid,
  );
});

Deno.test('authorization header check', () => {
  assertEquals(isAuthorized('Bearer s3cret', 's3cret'), true);
  assertEquals(isAuthorized('s3cret', 's3cret'), true);
  assertEquals(isAuthorized('Bearer nope', 's3cret'), false);
  assertEquals(isAuthorized(null, 's3cret'), false);
  assertEquals(isAuthorized('', ''), false);
});
