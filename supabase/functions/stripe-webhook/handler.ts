/**
 * Stripe events -> profile updates. Pure mapping, tested without network.
 * Subscriptions: status trialing/active/past_due keep Premium until current_period_end;
 * canceled/unpaid/incomplete_expired revoke. Lifetime: checkout.session.completed in payment
 * mode with metadata.plan = lifetime.
 */

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export type StripeAction =
  | { kind: 'link_customer'; userId: string; customerId: string }
  | {
    kind: 'lifetime';
    userId: string;
    reference: string;
    amountCents: number | null;
    customerId: string | null;
  }
  | {
    kind: 'subscription';
    userId: string | null;
    customerId: string | null;
    subscriptionId: string;
    isPremium: boolean;
    premiumUntil: string | null;
  }
  | { kind: 'ignore'; reason: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE = new Set(['trialing', 'active', 'past_due']);

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function metaUser(obj: Record<string, unknown>): string | null {
  const meta = (obj['metadata'] ?? {}) as Record<string, unknown>;
  const id = str(meta['user_id']) ?? str(obj['client_reference_id']);
  return id && UUID.test(id) ? id : null;
}

export function actionFor(event: StripeEvent): StripeAction {
  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = metaUser(obj);
      if (!userId) return { kind: 'ignore', reason: 'no user id on the session' };
      const customerId = str(obj['customer']);
      const meta = (obj['metadata'] ?? {}) as Record<string, unknown>;
      if (obj['mode'] === 'payment' && meta['plan'] === 'lifetime') {
        if (obj['payment_status'] !== 'paid') {
          return { kind: 'ignore', reason: 'lifetime session not paid' };
        }
        const amount = typeof obj['amount_total'] === 'number' ? obj['amount_total'] : null;
        return {
          kind: 'lifetime',
          userId,
          reference: event.data.object['id'] as string,
          amountCents: amount,
          customerId,
        };
      }
      if (customerId) return { kind: 'link_customer', userId, customerId };
      return { kind: 'ignore', reason: 'nothing to link' };
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const status = str(obj['status']) ?? '';
      const periodEnd = typeof obj['current_period_end'] === 'number'
        ? new Date((obj['current_period_end'] as number) * 1000).toISOString()
        : null;
      const isPremium = event.type !== 'customer.subscription.deleted' && ACTIVE.has(status);
      return {
        kind: 'subscription',
        userId: metaUser(obj),
        customerId: str(obj['customer']),
        subscriptionId: obj['id'] as string,
        isPremium,
        // Canceled at period end keeps access until then; revoked now otherwise.
        premiumUntil: isPremium ? periodEnd : new Date().toISOString(),
      };
    }
    default:
      return { kind: 'ignore', reason: `unhandled ${event.type}` };
  }
}
