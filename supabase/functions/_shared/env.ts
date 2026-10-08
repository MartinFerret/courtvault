/** Environment access for edge functions. Secrets never reach a client. */

export function env(name: string): string | undefined {
  return Deno.env.get(name) ?? undefined;
}

export function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export type StatsProviderName = 'mock' | 'highlightly';
export type PriceProviderName = 'mock' | 'ebay' | 'cardsight';
export type PushProviderName = 'log' | 'fcm';
export type EmailProviderName = 'log' | 'brevo';

export function statsProviderName(): StatsProviderName {
  return env('STATS_PROVIDER') === 'highlightly' ? 'highlightly' : 'mock';
}
export function priceProviderName(): PriceProviderName {
  const name = env('PRICE_PROVIDER');
  return name === 'cardsight' ? 'cardsight' : name === 'ebay' ? 'ebay' : 'mock';
}
export function pushProviderName(): PushProviderName {
  return env('PUSH_PROVIDER') === 'fcm' ? 'fcm' : 'log';
}
export function emailProviderName(): EmailProviderName {
  return env('EMAIL_PROVIDER') === 'brevo' ? 'brevo' : 'log';
}
/** Digest emails a single run may send (Brevo free plan: 300/day shared with login codes). */
export function emailDailyBudget(): number {
  const n = Number.parseInt(env('EMAIL_DAILY_BUDGET') ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 220;
}
