import {
  emailProviderName,
  priceProviderName,
  pushProviderName,
  statsProviderName,
} from '../env.ts';
import {
  HighlightlyStatsProvider,
  type KnownPlayer,
  MockStatsProvider,
  type StatsProvider,
} from './stats.ts';
import { EbayBrowsePriceProvider, MockPriceProvider, type PriceProvider } from './prices.ts';
import { FcmPushProvider, LogPushProvider, type PushProvider } from './push.ts';
import { BrevoEmailProvider, type EmailProvider, LogEmailProvider } from './email.ts';
import { type BulkPriceProvider, CardSightPriceProvider } from './cardsight.ts';

export function createStatsProvider(players: KnownPlayer[]): StatsProvider {
  return statsProviderName() === 'highlightly'
    ? new HighlightlyStatsProvider()
    : new MockStatsProvider(players);
}

/** Per-query providers (eBay Browse, mock). CardSight is bulk: see createBulkPriceProvider. */
export function createPriceProvider(day?: string): PriceProvider {
  return priceProviderName() === 'ebay'
    ? new EbayBrowsePriceProvider()
    : new MockPriceProvider(day);
}

/** The bulk provider when PRICE_PROVIDER=cardsight, else null (job-prices uses the per-query path). */
export function createBulkPriceProvider(): BulkPriceProvider | null {
  return priceProviderName() === 'cardsight' ? new CardSightPriceProvider() : null;
}

export function createPushProvider(): PushProvider {
  return pushProviderName() === 'fcm' ? new FcmPushProvider() : new LogPushProvider();
}

export function createEmailProvider(): EmailProvider {
  return emailProviderName() === 'brevo' ? new BrevoEmailProvider() : new LogEmailProvider();
}

export type { GameSummary, PlayerLine, StatsProvider } from './stats.ts';
export type { PriceProvider, PriceQuery, PriceQuote } from './prices.ts';
export type {
  BulkPriceProvider,
  BulkPriceRequest,
  PriceKind,
  PriceObservation,
} from './cardsight.ts';
export type { PushMessage, PushProvider, PushResult } from './push.ts';
export type { EmailMessage, EmailProvider, EmailResult } from './email.ts';
