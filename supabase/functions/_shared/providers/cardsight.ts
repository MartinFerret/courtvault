/**
 * CardSight AI (https://cardsight.ai): the price source since 2026-10-08, and the catalog
 * our cards are mapped to. Prices are eBay sales and listings as CardSight collects them.
 *
 * Two contracts live here:
 * - BulkPriceProvider: one request prices up to 100 cards for one parallel and one grade
 *   (POST /v1/pricing/ counts as ONE call, verified on 2026-10-08). job-prices groups its
 *   work that way to stay inside the free tier (750 calls a month).
 * - CardSightClient: the HTTP layer, with a short-term cache (their ToS §3(c)), a call
 *   counter, and the catalog reads job-catalog-map needs.
 *
 * Nothing from a response is stored except what the caller writes: our own aggregates.
 * The subscription endpoint echoes the API key: its body is never logged.
 */
import { env, requireEnv } from '../env.ts';
import { HttpError, RetryableError, withRetry } from '../http.ts';
import { robustMedianCents } from './prices.ts';
import { hashInt } from './stats.ts';

export type PriceKind = 'auction_median' | 'last_auction' | 'ask_median';

export interface BulkPriceRequest {
  /** The caller's handle for this (card, parallel, grade), echoed back untouched. */
  key: string;
  cardsightCardId: string;
  /** null = the base card only. */
  cardsightParallelId: string | null;
  /** null = ungraded only. */
  cardsightGradeId: string | null;
}

export interface PriceObservation {
  key: string;
  kind: PriceKind;
  priceCents: number;
  /** Sales behind an auction figure, asks behind an asking figure. */
  sampleSize: number;
  /** Date of the latest auction sale used, null for an asking price. */
  saleAt: string | null;
  source: string;
  /** Only when asked for (raw listings flag): the records the figure came from. */
  records?: CardSightRecord[];
}

export interface BulkPriceProvider {
  readonly name: string;
  /** Prices every request it can; a missing key means no data. Reports the calls it made. */
  quoteMany(
    requests: BulkPriceRequest[],
    options?: { includeRecords?: boolean },
  ): Promise<{ results: Map<string, PriceObservation>; calls: number; failures: string[] }>;
  /** Calls counted against the monthly quota so far (free to read), null when unknown. */
  usage(): Promise<number | null>;
}

// ---------------------------------------------------------------------------
// Response shapes (the fields we read; the API has more)
// ---------------------------------------------------------------------------

export interface CardSightRecord {
  price: number;
  date: string;
  listing_type: 'auction' | 'fixed' | string;
  source?: string;
  url?: string;
  title?: string;
}

export interface CardSightPricingData {
  raw?: { count?: number; records?: CardSightRecord[] };
  graded?: {
    company_name?: string;
    grades?: { grade_value?: string; count?: number; records?: CardSightRecord[] }[];
  }[];
  meta?: { total_records?: number; last_sale_date?: string | null };
  messages?: { type?: string; message?: string }[];
}

export interface CardSightBulkResponse {
  results: {
    card_id: string;
    success: boolean;
    data?: CardSightPricingData;
    error?: { code?: string; message?: string };
  }[];
  meta: { requested: number; successful: number; failed: number };
}

// ---------------------------------------------------------------------------
// Pure: from the records of one card to the figure we show
// ---------------------------------------------------------------------------

/** The records of a pricing result: the raw section, or every graded section when graded. */
export function recordsOf(
  data: CardSightPricingData | undefined,
  graded: boolean,
): CardSightRecord[] {
  if (!data) return [];
  if (!graded) return data.raw?.records ?? [];
  const out: CardSightRecord[] = [];
  for (const company of data.graded ?? []) {
    for (const grade of company.grades ?? []) out.push(...(grade.records ?? []));
  }
  return out;
}

export interface ObserveOptions {
  /** Auction sales needed for a median. */
  minAuctionSales: number;
}

/**
 * The three states, in order: median of completed auction sales when there are enough,
 * else the latest auction sale with its date, else the median of current asking prices.
 * Null when the card has nothing usable.
 */
export function observe(
  records: CardSightRecord[],
  options: ObserveOptions = { minAuctionSales: 3 },
): Omit<PriceObservation, 'key'> | null {
  const usable = records.filter((r) => Number.isFinite(r.price) && r.price > 0 && !!r.date);
  const auctions = usable
    .filter((r) => r.listing_type === 'auction')
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const cents = (r: CardSightRecord) => Math.round(r.price * 100);

  if (auctions.length >= options.minAuctionSales) {
    const stats = robustMedianCents(auctions.map(cents));
    if (stats) {
      return {
        kind: 'auction_median',
        priceCents: stats.median,
        sampleSize: stats.used,
        saleAt: auctions[0]!.date,
        source: 'cardsight',
      };
    }
  }
  if (auctions.length > 0) {
    return {
      kind: 'last_auction',
      priceCents: cents(auctions[0]!),
      sampleSize: auctions.length,
      saleAt: auctions[0]!.date,
      source: 'cardsight',
    };
  }
  const asks = usable.filter((r) => r.listing_type === 'fixed');
  const stats = robustMedianCents(asks.map(cents));
  if (!stats) return null;
  return {
    kind: 'ask_median',
    priceCents: stats.median,
    sampleSize: stats.used,
    saleAt: null,
    source: 'cardsight',
  };
}

/** Lowercase letters and digits only, so "Gold Refractor" and "gold-refractor" meet. */
export function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ---------------------------------------------------------------------------
// HTTP client with a short-term cache and a call counter
// ---------------------------------------------------------------------------

export interface CacheStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, body: unknown, expiresAt: Date): Promise<void>;
}

export interface CardSightClientOptions {
  apiKey?: string;
  apiBase?: string;
  cache?: CacheStore;
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Serve from the cache when a fresh enough copy exists; write it otherwise. */
  cacheTtlMs?: number;
}

export class CardSightClient {
  /** Requests actually sent (cache hits excluded). The subscription read is free upstream. */
  calls = 0;
  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly cache: CacheStore | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CardSightClientOptions = {}) {
    this.apiKey = options.apiKey ?? requireEnv('CARDSIGHT_API_KEY');
    this.apiBase = options.apiBase ?? env('CARDSIGHT_API_BASE') ?? 'https://api.cardsight.ai';
    this.cache = options.cache;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T>(method: 'GET' | 'POST', path: string, options: RequestOptions = {}): Promise<T> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params ?? {})) {
      if (v !== undefined) query.set(k, String(v));
    }
    const url = `${this.apiBase}${path}${query.size > 0 ? `?${query}` : ''}`;
    const bodyText = options.body === undefined ? '' : JSON.stringify(options.body);
    const cacheKey = `${method} ${url} ${hashInt(bodyText)}`;

    if (this.cache && options.cacheTtlMs) {
      const hit = await this.cache.get(cacheKey);
      if (hit !== null && hit !== undefined) return hit as T;
    }

    const result = await withRetry(async () => {
      const res = await this.fetchImpl(url, {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          Accept: 'application/json',
          ...(bodyText ? { 'Content-Type': 'application/json' } : {}),
          'User-Agent': 'HoopTicker/1.0 (+https://hoopticker.com)',
        },
        body: bodyText || undefined,
      });
      if (res.status === 429 || res.status >= 500) {
        throw new RetryableError(`CardSight ${res.status}`);
      }
      if (!res.ok) throw new HttpError(`CardSight ${method} ${path}: ${res.status}`, 502);
      return (await res.json()) as T;
    });
    this.calls++;

    if (this.cache && options.cacheTtlMs) {
      await this.cache.set(cacheKey, result, new Date(Date.now() + options.cacheTtlMs));
    }
    return result;
  }

  /** Calls counted this month. Free, and the response (which echoes the key) is never logged. */
  async usage(): Promise<number | null> {
    try {
      const data = await this.request<{ calls?: number }>('GET', '/v1/subscription/');
      this.calls--; // not billed
      return typeof data.calls === 'number' ? data.calls : null;
    } catch {
      return null;
    }
  }

  // --- Catalog reads used by job-catalog-map ---------------------------------

  listReleases(params: { segment: string; minYear: string }) {
    return this.request<{ releases: CardSightRelease[]; total_count: number }>(
      'GET',
      '/v1/catalog/releases',
      {
        params: {
          segment: params.segment,
          min_year: params.minYear,
          take: 100,
          sort: 'year',
          order: 'desc',
        },
      },
    );
  }

  listSets(releaseId: string) {
    return this.request<{ sets: CardSightSet[]; total_count: number }>('GET', '/v1/catalog/sets', {
      params: { releaseId, take: 100 },
    });
  }

  getSet(setId: string) {
    return this.request<CardSightSet & { parallels?: CardSightParallel[] }>(
      'GET',
      `/v1/catalog/sets/${setId}`,
    );
  }

  async listSetCards(setId: string): Promise<CardSightCard[]> {
    const cards: CardSightCard[] = [];
    let skip = 0;
    for (;;) {
      const page = await this.request<{ cards: CardSightCard[]; total_count: number }>(
        'GET',
        `/v1/catalog/sets/${setId}/cards`,
        { params: { take: 100, skip, sort: 'number' } },
      );
      cards.push(...page.cards);
      skip += 100;
      if (page.cards.length === 0 || skip >= page.total_count) break;
    }
    return cards;
  }

  /** PSA grade ids for the grades we track (grading type "Card"). Three calls. */
  async psaGradeIds(): Promise<Record<'PSA9' | 'PSA10', string> | null> {
    const { companies } = await this.request<{ companies: { id: string; name: string }[] }>(
      'GET',
      '/v1/grades/companies',
    );
    const psa = companies.find((c) => c.name.toUpperCase() === 'PSA');
    if (!psa) return null;
    const { types } = await this.request<{ types: { id: string; name: string }[] }>(
      'GET',
      `/v1/grades/companies/${psa.id}/types`,
    );
    const type = types.find((t) => t.name.toLowerCase() === 'card') ?? types[0];
    if (!type) return null;
    const { grades } = await this.request<{ grades: { id: string; grade?: string }[] }>(
      'GET',
      `/v1/grades/companies/${psa.id}/types/${type.id}/grades`,
    );
    const find = (n: string) => grades.find((g) => String(g.grade ?? '').trim() === n);
    const g9 = find('9');
    const g10 = find('10');
    return g9 && g10 ? { PSA9: g9.id, PSA10: g10.id } : null;
  }
}

export interface CardSightRelease {
  id: string;
  name: string;
  year?: string;
}
export interface CardSightSet {
  id: string;
  name: string;
  cardCount?: number;
  parallelCount?: number;
  is_identifiable?: boolean;
}
export interface CardSightParallel {
  id: string;
  name: string;
  numberedTo?: number | null;
  isPartial?: boolean;
}
export interface CardSightCard {
  id: string;
  number: string;
  name: string;
  attributes?: string[];
}

// ---------------------------------------------------------------------------
// The provider
// ---------------------------------------------------------------------------

export const BULK_MAX_CARDS = 100;

/** Group key: one bulk call prices one parallel and one grade for up to 100 cards. */
export function bulkGroupKey(
  r: { cardsightParallelId: string | null; cardsightGradeId: string | null },
): string {
  return `${r.cardsightParallelId ?? 'base'}|${r.cardsightGradeId ?? 'raw'}`;
}

export class CardSightPriceProvider implements BulkPriceProvider {
  readonly name = 'cardsight';
  readonly client: CardSightClient;
  private readonly period: string;
  private readonly minAuctionSales: number;
  private readonly cacheTtlMs: number;
  private readonly concurrency: number;

  constructor(
    options: CardSightClientOptions & {
      period?: string;
      minAuctionSales?: number;
      cacheTtlMs?: number;
      concurrency?: number;
    } = {},
  ) {
    this.client = new CardSightClient(options);
    this.period = options.period ?? '3m';
    this.minAuctionSales = options.minAuctionSales ?? 3;
    this.cacheTtlMs = options.cacheTtlMs ?? 12 * 3_600_000;
    this.concurrency = options.concurrency ?? 3;
  }

  usage(): Promise<number | null> {
    return this.client.usage();
  }

  async quoteMany(
    requests: BulkPriceRequest[],
    options: { includeRecords?: boolean } = {},
  ): Promise<{ results: Map<string, PriceObservation>; calls: number; failures: string[] }> {
    const results = new Map<string, PriceObservation>();
    const failures: string[] = [];
    const before = this.client.calls;

    const groups = new Map<string, BulkPriceRequest[]>();
    for (const r of requests) {
      const key = bulkGroupKey(r);
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    const chunks: BulkPriceRequest[][] = [];
    for (const group of groups.values()) {
      for (let i = 0; i < group.length; i += BULK_MAX_CARDS) {
        chunks.push(group.slice(i, i + BULK_MAX_CARDS));
      }
    }

    const priceChunk = async (chunk: BulkPriceRequest[]) => {
      const first = chunk[0]!;
      const graded = first.cardsightGradeId !== null;
      try {
        const response = await this.client.request<CardSightBulkResponse>('POST', '/v1/pricing/', {
          body: {
            card_ids: chunk.map((r) => r.cardsightCardId),
            parallel_id: first.cardsightParallelId,
            grade_id: first.cardsightGradeId,
            period: this.period,
            listing_type: 'both',
            // The default; 100 made the upstream time out on 2026-10-08.
            limit: 25,
          },
          cacheTtlMs: this.cacheTtlMs,
        });
        const byCard = new Map(response.results.map((r) => [r.card_id, r]));
        for (const r of chunk) {
          const item = byCard.get(r.cardsightCardId);
          if (!item?.success) {
            if (item?.error?.message) failures.push(`${r.key}: ${item.error.message}`);
            continue;
          }
          const records = recordsOf(item.data, graded);
          const figure = observe(records, { minAuctionSales: this.minAuctionSales });
          if (!figure) continue;
          results.set(r.key, {
            key: r.key,
            ...figure,
            ...(options.includeRecords ? { records } : {}),
          });
        }
      } catch (err) {
        failures.push(
          `bulk ${bulkGroupKey(first)} x${chunk.length}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    };

    // Three in flight: under the 4 requests/second of the free tier, well under the function's wall clock.
    let next = 0;
    const workers = Array.from({ length: Math.min(this.concurrency, chunks.length) }, async () => {
      while (next < chunks.length) await priceChunk(chunks[next++]!);
    });
    await Promise.all(workers);
    return { results, calls: this.client.calls - before, failures };
  }
}
