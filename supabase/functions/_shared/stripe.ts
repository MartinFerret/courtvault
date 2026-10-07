/**
 * Minimal Stripe REST client (form-encoded) and webhook signature check. No SDK: the three
 * calls we need are small and the bundle stays light.
 */
import { requireEnv } from './env.ts';
import { HttpError } from './http.ts';

const API = 'https://api.stripe.com/v1';

export function stripeKey(): string {
  return requireEnv('STRIPE_SECRET_KEY');
}

/** Flattens {a: {b: 1}, c: [x]} into Stripe's form keys: a[b]=1, c[0]=x. */
export function toForm(params: Record<string, unknown>, prefix = ''): URLSearchParams {
  const out = new URLSearchParams();
  const walk = (value: unknown, key: string) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${key}[${i}]`));
    else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, key ? `${key}[${k}]` : k);
      }
    } else out.append(key, String(value));
  };
  walk(params, prefix);
  return out;
}

export async function stripePost<T>(
  path: string,
  params: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: toForm(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: { message?: string } }).error?.message ??
      `Stripe ${res.status}`;
    throw new HttpError(message, res.status >= 500 ? 502 : 400);
  }
  return body as T;
}

/**
 * Stripe-Signature: "t=<unix>,v1=<hex>[,v1=...]". The signed payload is "<t>.<raw body>",
 * HMAC-SHA256 with the endpoint secret. Rejects stale timestamps (default 5 minutes).
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.trim().split('=') as [string, string]).filter((p) =>
      p.length === 2
    ),
  ) as Record<string, string>;
  const v1s = header.split(',').map((p) => p.trim()).filter((p) => p.startsWith('v1=')).map((p) =>
    p.slice(3)
  );
  const t = Number.parseInt(parts['t'] ?? '', 10);
  if (!Number.isFinite(t) || v1s.length === 0) return false;
  if (Math.abs(now - t) > toleranceSeconds) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return v1s.some((sig) => timingSafeEqual(sig, expected));
}

export async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
