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

export function createStatsProvider(players: KnownPlayer[]): StatsProvider {
  return statsProviderName() === 'highlightly'
    ? new HighlightlyStatsProvider()
    : new MockStatsProvider(players);
}

export function createPriceProvider(day?: string): PriceProvider {
  return priceProviderName() === 'ebay'
    ? new EbayBrowsePriceProvider()
    : new MockPriceProvider(day);
}

export function createPushProvider(): PushProvider {
  return pushProviderName() === 'fcm' ? new FcmPushProvider() : new LogPushProvider();
}

export function createEmailProvider(): EmailProvider {
  return emailProviderName() === 'brevo' ? new BrevoEmailProvider() : new LogEmailProvider();
}

export type { GameSummary, PlayerLine, StatsProvider } from './stats.ts';
export type { PriceProvider, PriceQuery, PriceQuote } from './prices.ts';
export type { PushMessage, PushProvider, PushResult } from './push.ts';
export type { EmailMessage, EmailProvider, EmailResult } from './email.ts';
