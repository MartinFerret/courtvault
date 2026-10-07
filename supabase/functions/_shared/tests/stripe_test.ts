import { assertEquals } from '@std/assert';
import { hmacHex, toForm, verifyStripeSignature } from '../stripe.ts';
import { actionFor } from '../../stripe-webhook/handler.ts';

Deno.test('toForm flattens nested params the Stripe way', () => {
  const f = toForm({
    mode: 'subscription',
    line_items: [{ price: 'price_1', quantity: 1 }],
    metadata: { user_id: 'u' },
  });
  assertEquals(f.get('mode'), 'subscription');
  assertEquals(f.get('line_items[0][price]'), 'price_1');
  assertEquals(f.get('metadata[user_id]'), 'u');
});

Deno.test('verifyStripeSignature accepts a fresh v1 signature and rejects a stale or wrong one', async () => {
  const secret = 'whsec_test';
  const body = '{"id":"evt_1","type":"x"}';
  const t = 1_700_000_000;
  const sig = await hmacHex(secret, `${t}.${body}`);
  assertEquals(await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, 300, t + 10), true);
  assertEquals(await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, 300, t + 1000), false);
  assertEquals(await verifyStripeSignature(body, `t=${t},v1=deadbeef`, secret, 300, t), false);
  assertEquals(await verifyStripeSignature(body + ' ', `t=${t},v1=${sig}`, secret, 300, t), false);
});

const USER = '11111111-2222-4333-8444-555555555555';

Deno.test('subscription events map to premium until the period end', () => {
  const a = actionFor({
    id: 'evt_2',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        current_period_end: 1_800_000_000,
        metadata: { user_id: USER },
      },
    },
  });
  assertEquals(a.kind, 'subscription');
  if (a.kind === 'subscription') {
    assertEquals(a.isPremium, true);
    assertEquals(a.premiumUntil, new Date(1_800_000_000 * 1000).toISOString());
    assertEquals(a.userId, USER);
  }
  const d = actionFor({
    id: 'evt_3',
    type: 'customer.subscription.deleted',
    data: { object: { id: 'sub_1', customer: 'cus_1', status: 'canceled', metadata: {} } },
  });
  assertEquals(d.kind === 'subscription' && d.isPremium, false);
});

Deno.test('lifetime checkout maps to a grant, unpaid sessions are ignored', () => {
  const paid = actionFor({
    id: 'evt_4',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        mode: 'payment',
        payment_status: 'paid',
        amount_total: 14900,
        customer: 'cus_9',
        client_reference_id: USER,
        metadata: { plan: 'lifetime', user_id: USER },
      },
    },
  });
  assertEquals(paid, {
    kind: 'lifetime',
    userId: USER,
    reference: 'cs_1',
    amountCents: 14900,
    customerId: 'cus_9',
  });
  const unpaid = actionFor({
    id: 'evt_5',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_2',
        mode: 'payment',
        payment_status: 'unpaid',
        client_reference_id: USER,
        metadata: { plan: 'lifetime' },
      },
    },
  });
  assertEquals(unpaid.kind, 'ignore');
  const sub = actionFor({
    id: 'evt_6',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_3',
        mode: 'subscription',
        customer: 'cus_3',
        client_reference_id: USER,
        metadata: { plan: 'yearly' },
      },
    },
  });
  assertEquals(sub, { kind: 'link_customer', userId: USER, customerId: 'cus_3' });
});
