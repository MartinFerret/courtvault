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
export type PriceProviderName = 'mock' | 'ebay';
export type PushProviderName = 'log' | 'fcm';

export function statsProviderName(): StatsProviderName {
  return env('STATS_PROVIDER') === 'highlightly' ? 'highlightly' : 'mock';
}
export function priceProviderName(): PriceProviderName {
  return env('PRICE_PROVIDER') === 'ebay' ? 'ebay' : 'mock';
}
export function pushProviderName(): PushProviderName {
  return env('PUSH_PROVIDER') === 'fcm' ? 'fcm' : 'log';
}
