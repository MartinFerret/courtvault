/**
 * PriceProvider: median asking price for a parallel and grade.
 * Implementations: eBay Browse API (active listings = ASKING prices, not sold) and Mock.
 * Selected by PRICE_PROVIDER. Swapping to a paid sold-price provider = a new class in this file.
 */
import { HttpError, RetryableError, withRetry } from '../http.ts';
import { env, requireEnv } from '../env.ts';
import { hashInt } from './stats.ts';

export type Grade = 'RAW' | 'PSA9' | 'PSA10';

export interface PriceQuery {
  season: string;
  setName: string;
  playerName: string;
  cardNumber: string;
  parallelName: string;
  serialRun: number | null;
  grade: Grade;
  /** Last known price, if any. Real providers ignore it; the mock drifts from it. */
  currentCents?: number | null;
}

export interface PriceQuote {
  priceCents: number;
  sampleSize: number;
  buyUrl: string | null;
  source: string;
}

export interface PriceProvider {
  readonly name: string;
  quote(query: PriceQuery): Promise<PriceQuote | null>;
}

/** Search string built from season, set, player, number, parallel and grade. */
export function buildSearchQuery(q: PriceQuery): string {
  const parts = [q.season, q.setName, q.playerName, `#${q.cardNumber}`];
  if (q.parallelName.toLowerCase() !== 'base') parts.push(q.parallelName);
  if (q.serialRun) parts.push(`/${q.serialRun}`);
  if (q.grade === 'PSA9') parts.push('PSA 9');
  if (q.grade === 'PSA10') parts.push('PSA 10');
  const exclusions = q.grade === 'RAW' ? ' -PSA -BGS -SGC -CGC -lot -reprint' : ' -lot -reprint';
  return parts.join(' ') + exclusions;
}

/** Median after removing outliers outside 1.5 x IQR. Returns null when there is no data. */
export function robustMedianCents(prices: number[]): { median: number; used: number } | null {
  const sorted = prices.filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  let kept = sorted;
  if (sorted.length >= 4) {
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    kept = sorted.filter((p) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);
    if (kept.length === 0) kept = sorted;
  }
  const mid = Math.floor(kept.length / 2);
  const median = kept.length % 2 === 1 ? kept[mid]! : Math.round((kept[mid - 1]! + kept[mid]!) / 2);
  return { median, used: kept.length };
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? sorted[base]! + rest * (next - sorted[base]!) : sorted[base]!;
}

// ---------------------------------------------------------------------------
// eBay Browse API (active listings). OAuth client credentials, marketplace EBAY_US.
// Affiliate tracking via X-EBAY-C-ENDUSERCTX when EBAY_AFFILIATE_CAMPAIGN_ID is set.
// ---------------------------------------------------------------------------

export interface EbayItemSummary {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
  buyingOptions?: string[];
}

export interface EbaySearchResponse {
  total?: number;
  itemSummaries?: EbayItemSummary[];
}

const SPORTS_TRADING_CARD_SINGLES_CATEGORY = '261328';

export function mapEbaySearch(body: EbaySearchResponse, buyUrl: string | null): PriceQuote | null {
  const cents = (body.itemSummaries ?? [])
    .filter((item) => (item.price?.currency ?? 'USD') === 'USD')
    .map((item) => Math.round(Number(item.price?.value) * 100));
  const stats = robustMedianCents(cents);
  if (!stats) return null;
  return { priceCents: stats.median, sampleSize: stats.used, buyUrl, source: 'ebay_asking' };
}

/** eBay Partner Network search link (works without the API; plain search when no campaign). */
export function ebaySearchUrl(searchQuery: string, campaignId: string | undefined): string {
  const base = `https://www.ebay.com/sch/i.html?_nkw=${
    encodeURIComponent(searchQuery)
  }&_sacat=${SPORTS_TRADING_CARD_SINGLES_CATEGORY}`;
  if (!campaignId) return base;
  return `${base}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${
    encodeURIComponent(campaignId)
  }&toolid=10001&mkevt=1`;
}

export class EbayBrowsePriceProvider implements PriceProvider {
  readonly name = 'ebay';
  private token: { value: string; expiresAt: number } | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly campaignId: string | undefined;
  private readonly apiBase: string;

  constructor(
    options: { clientId?: string; clientSecret?: string; campaignId?: string; apiBase?: string } =
      {},
  ) {
    this.clientId = options.clientId ?? requireEnv('EBAY_CLIENT_ID');
    this.clientSecret = options.clientSecret ?? requireEnv('EBAY_CLIENT_SECRET');
    this.campaignId = options.campaignId ?? env('EBAY_AFFILIATE_CAMPAIGN_ID') ?? undefined;
    this.apiBase = options.apiBase ?? env('EBAY_API_BASE') ?? 'https://api.ebay.com';
  }

  async quote(query: PriceQuery): Promise<PriceQuote | null> {
    const q = buildSearchQuery(query);
    const params = new URLSearchParams({
      q,
      category_ids: SPORTS_TRADING_CARD_SINGLES_CATEGORY,
      filter: 'buyingOptions:{FIXED_PRICE|BEST_OFFER},priceCurrency:USD,itemLocationCountry:US',
      limit: '50',
      sort: 'price',
    });
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.accessToken()}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      Accept: 'application/json',
    };
    if (this.campaignId) {
      headers['X-EBAY-C-ENDUSERCTX'] =
        `affiliateCampaignId=${this.campaignId},affiliateReferenceId=courtvault`;
    }
    const body = await withRetry(async () => {
      const res = await fetch(`${this.apiBase}/buy/browse/v1/item_summary/search?${params}`, {
        headers,
      });
      if (res.status === 429 || res.status >= 500) throw new RetryableError(`eBay ${res.status}`);
      if (!res.ok) throw new HttpError(`eBay search ${res.status}: ${await res.text()}`, 502);
      return (await res.json()) as EbaySearchResponse;
    });
    return mapEbaySearch(body, ebaySearchUrl(q, this.campaignId));
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    const res = await fetch(`${this.apiBase}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    });
    if (!res.ok) throw new HttpError(`eBay OAuth ${res.status}: ${await res.text()}`, 502);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return this.token.value;
  }
}

// ---------------------------------------------------------------------------
// Mock: deterministic prices, drifting slowly day by day so history charts render.
// ---------------------------------------------------------------------------

export class MockPriceProvider implements PriceProvider {
  readonly name = 'mock';
  constructor(private readonly day: string = new Date().toISOString().slice(0, 10)) {}

  quote(query: PriceQuery): Promise<PriceQuote | null> {
    const key =
      `${query.season}|${query.setName}|${query.playerName}|${query.cardNumber}|${query.parallelName}`;
    const base = 400 + (hashInt(key) % 4000);
    const parallelMultiplier = query.serialRun === 1
      ? 800
      : query.serialRun === 5
      ? 120
      : query.serialRun && query.serialRun <= 50
      ? 25
      : query.parallelName.toLowerCase() === 'base'
      ? 1
      : 3;
    const gradeMultiplier = query.grade === 'PSA10' ? 5 : query.grade === 'PSA9' ? 2.2 : 1;
    const drift = 1 + ((hashInt(`${key}|${this.day}`) % 601) - 300) / 10000;
    // Drift from the last known price when there is one (consistent with the seed), else synthesize.
    const price = (query.currentCents ?? base * parallelMultiplier * gradeMultiplier) * drift;
    const rounded = price >= 2000 ? Math.round(price / 100) * 100 : Math.round(price);
    return Promise.resolve({
      priceCents: rounded,
      sampleSize: 5 + (hashInt(key) % 20),
      buyUrl: ebaySearchUrl(buildSearchQuery(query), undefined),
      source: 'mock',
    });
  }
}
