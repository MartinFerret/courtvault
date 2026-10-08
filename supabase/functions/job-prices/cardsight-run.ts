/**
 * job-prices with CardSight: the nightly pricing run under the monthly quota.
 *
 * 1. Reads the calls already counted this month (free endpoint) and picks a mode:
 *    normal (< 80% of the quota), essential (owned, followed, alerts and last night's players
 *    only), critical (last night's players only, and the admin gets one email a month).
 * 2. Builds the work list: the usual priorities, plus the full pass once a week in normal mode.
 * 3. Plans it: last night first, the daily card cap, then as many bulk calls as the budget
 *    allows (one call per parallel, grade and 100 cards).
 * 4. Writes our own aggregates through record_price(): auction median, last auction sale or
 *    asking median, never the listings themselves (unless the raw listings flag is on).
 */
import type { JobContext } from '../_shared/jobs.ts';
import { env, requireEnv } from '../_shared/env.ts';
import { createEmailProvider } from '../_shared/providers/index.ts';
import {
  type BulkPriceRequest,
  type CacheStore,
  CardSightPriceProvider,
} from '../_shared/providers/cardsight.ts';
import { buildSearchQuery, ebaySearchUrl } from '../_shared/providers/prices.ts';
import {
  callsAllowed,
  decideMode,
  type GuardSettings,
  isFullPassDue,
  planRun,
  type PlanTarget,
  reasonAllowed,
  type RunMode,
} from '../_shared/pricing-plan.ts';
import type { ServiceClient } from '../_shared/supabase.ts';

interface PriceSourceSettings extends GuardSettings {
  dailyCardCap: number;
  fullPassWeekday: number;
  period: string;
  auctionMinSales: number;
  storeRawListings: boolean;
  /** One-shot: run the full pass on the next run whatever the weekday (after an import). */
  forceFullPass: boolean;
}

interface RunState {
  last_full_pass_day?: string | null;
  last_run_day?: string | null;
  guard_emailed_month?: string | null;
  last_usage?: number | null;
}

interface TargetRow {
  parallel_id: string;
  grade: 'RAW' | 'PSA9' | 'PSA10';
  reason: string;
  priority: number;
  card_id: string;
  cardsight_card_id: string;
  cardsight_parallel_id: string | null;
  parallel_name: string;
  serial_run: number | null;
  card_number: string;
  player_name: string;
  set_name: string;
  season: string;
  current_cents: number | null;
  current_kind: string | null;
}

type Target = PlanTarget & TargetRow & { grade_id: string | null };

interface Coverage {
  requested: number;
  priced: number;
  skipped: number;
}

const CACHE_TTL_MS = 12 * 3_600_000;

async function readSettings(supabase: ServiceClient): Promise<PriceSourceSettings> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'price_source')
    .maybeSingle();
  const v = (data?.value ?? {}) as Record<string, unknown>;
  const num = (k: string, d: number) => (typeof v[k] === 'number' ? (v[k] as number) : d);
  return {
    monthlyQuota: num('monthly_quota', 750),
    guardSoft: num('guard_soft', 0.8),
    guardHard: num('guard_hard', 0.95),
    reserveCalls: num('reserve_calls', 10),
    dailyCardCap: num('daily_card_cap', 300),
    fullPassWeekday: num('full_pass_weekday', 0),
    period: typeof v.period === 'string' ? v.period : '3m',
    auctionMinSales: num('auction_min_sales', 3),
    storeRawListings: v.store_raw_listings === true,
    forceFullPass: v.force_full_pass === true,
  };
}

async function readState(supabase: ServiceClient): Promise<RunState> {
  const { data } = await supabase.from('app_settings').select('value').eq(
    'key',
    'price_source_state',
  ).maybeSingle();
  return (data?.value ?? {}) as RunState;
}

async function writeState(supabase: ServiceClient, state: RunState): Promise<void> {
  await supabase.from('app_settings').upsert({
    key: 'price_source_state',
    value: state,
    description:
      'Runtime state of job-prices with CardSight: last full pass, guard emails, last usage read',
    updated_at: new Date().toISOString(),
  });
}

/** The short-term cache lives in cardsight_cache; expired rows go at the start of a run. */
function supabaseCache(supabase: ServiceClient): CacheStore {
  return {
    async get(key) {
      const { data } = await supabase
        .from('cardsight_cache')
        .select('body')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      return data?.body ?? null;
    },
    async set(key, body, expiresAt) {
      await supabase.from('cardsight_cache').upsert({
        cache_key: key,
        body,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    },
  };
}

async function emailAdmin(subject: string, text: string): Promise<number> {
  if (!env('EMAIL_ADMIN')) return 0;
  const result = await createEmailProvider().send([
    {
      to: requireEnv('EMAIL_ADMIN'),
      subject,
      text,
      html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
      tag: 'prices',
    },
  ]);
  return result.sent;
}

export async function runCardSightPricing(
  { supabase, day, log }: JobContext,
): Promise<Record<string, unknown>> {
  const startedAt = Date.now();
  const settings = await readSettings(supabase);
  const state = await readState(supabase);
  await supabase.from('cardsight_cache').delete().lt('expires_at', new Date().toISOString());

  const provider = new CardSightPriceProvider({
    cache: supabaseCache(supabase),
    period: settings.period,
    minAuctionSales: settings.auctionMinSales,
    cacheTtlMs: CACHE_TTL_MS,
  });

  // 1. Where we stand this month. Unknown usage is treated as the last value we saw.
  const usageBefore = (await provider.usage()) ?? state.last_usage ?? 0;
  const mode: RunMode = decideMode(usageBefore, settings);
  const allowed = callsAllowed(usageBefore, settings);
  const month = day.slice(0, 7);
  let emailed = 0;
  if (mode === 'critical' && state.guard_emailed_month !== month) {
    emailed = await emailAdmin(
      `CardSight quota at ${usageBefore}/${settings.monthlyQuota}: pricing reduced to last night's players`,
      `job-prices on ${day}: ${usageBefore} of ${settings.monthlyQuota} CardSight calls are used this month (${
        Math.round((usageBefore / settings.monthlyQuota) * 100)
      }%). Until the quota resets, only cards of players who played last night are priced. Nothing else to do unless you want to upgrade the plan at https://cardsight.ai.`,
    );
  }

  // 2. The work list.
  const fullPass = mode === 'normal' &&
    (settings.forceFullPass ||
      isFullPassDue(day, settings.fullPassWeekday, state.last_full_pass_day ?? null));
  const listMode = fullPass ? 'full' : 'daily';
  // PostgREST caps a response at 1,000 rows: a full pass has several thousand targets.
  const rows: TargetRow[] = [];
  for (let from = 0;; from += 1000) {
    const { data: page, error: targetsError } = await supabase
      .rpc('cardsight_targets', { p_mode: listMode })
      .range(from, from + 999);
    if (targetsError) throw targetsError;
    rows.push(...((page ?? []) as TargetRow[]));
    if (!page || page.length < 1000) break;
  }
  const { data: unmapped } = await supabase.rpc('cardsight_unmapped_count', { p_mode: listMode });
  const { data: gradesSetting } = await supabase.from('app_settings').select('value').eq(
    'key',
    'cardsight_grades',
  ).maybeSingle();
  const gradeIds = (gradesSetting?.value ?? {}) as Partial<Record<'PSA9' | 'PSA10', string>>;

  const targets: Target[] = [];
  let noGradeId = 0;
  for (const r of rows) {
    if (!reasonAllowed(r.reason, mode)) continue;
    const gradeId = r.grade === 'RAW' ? null : (gradeIds[r.grade] ?? undefined);
    if (gradeId === undefined) {
      noGradeId++;
      continue;
    }
    targets.push({
      ...r,
      key: `${r.parallel_id}|${r.grade}`,
      cardId: r.card_id,
      cardsightParallelId: r.cardsight_parallel_id,
      cardsightGradeId: gradeId,
      grade_id: gradeId,
    });
  }

  // 3. The plan: priority order, card cap on a daily pass, then the call budget.
  const plan = planRun(targets, {
    maxCalls: allowed,
    maxCards: fullPass ? undefined : settings.dailyCardCap,
  });
  log('cardsight plan', {
    mode,
    fullPass,
    usageBefore,
    allowed,
    targets: targets.length,
    planned: plan.targets.length,
    calls: plan.calls,
    dropped: plan.dropped,
    unmapped: unmapped ?? null,
    noGradeId,
  });

  const coverage = new Map<string, Coverage>();
  const bump = (reason: string, key: keyof Coverage) => {
    const c = coverage.get(reason) ?? { requested: 0, priced: 0, skipped: 0 };
    c[key]++;
    coverage.set(reason, c);
  };
  for (const t of targets) bump(t.reason, 'requested');
  const plannedKeys = new Set(plan.targets.map((t) => t.key));
  for (const t of targets) if (!plannedKeys.has(t.key)) bump(t.reason, 'skipped');

  // 4. Price and write.
  const capturedAt = new Date().toISOString();
  const campaign = env('EBAY_AFFILIATE_CAMPAIGN_ID') ?? undefined;
  const requests: BulkPriceRequest[] = plan.targets.map((t) => ({
    key: t.key,
    cardsightCardId: t.cardsight_card_id,
    cardsightParallelId: t.cardsightParallelId,
    cardsightGradeId: t.cardsightGradeId,
  }));
  const { results, calls, failures } = await provider.quoteMany(requests, {
    includeRecords: settings.storeRawListings,
  });

  let changed = 0;
  let missing = 0;
  const kinds: Record<string, number> = { auction_median: 0, last_auction: 0, ask_median: 0 };
  const write = async (t: Target) => {
    const figure = results.get(t.key);
    if (!figure) {
      missing++;
      bump(t.reason, 'skipped');
      return;
    }
    const buyUrl = ebaySearchUrl(
      buildSearchQuery({
        season: t.season,
        setName: t.set_name,
        playerName: t.player_name,
        cardNumber: t.card_number,
        parallelName: t.parallel_name,
        serialRun: t.serial_run,
        grade: t.grade,
      }),
      campaign,
    );
    const { data: wrote, error: recordError } = await supabase.rpc('record_price', {
      p_parallel_id: t.parallel_id,
      p_grade: t.grade,
      p_source: figure.source,
      p_price_cents: figure.priceCents,
      p_sample_size: figure.sampleSize,
      p_buy_url: buyUrl,
      p_captured_at: capturedAt,
      p_price_kind: figure.kind,
      p_sale_at: figure.saleAt,
    });
    if (recordError) throw recordError;
    kinds[figure.kind] = (kinds[figure.kind] ?? 0) + 1;
    bump(t.reason, 'priced');
    if (wrote) changed++;

    if (settings.storeRawListings && figure.records?.length) {
      await supabase.from('price_listings').insert(
        figure.records
          .filter((r) => r.listing_type === 'auction' || r.listing_type === 'fixed')
          .map((r) => ({
            parallel_id: t.parallel_id,
            grade: t.grade,
            listing_type: r.listing_type,
            price_cents: Math.round(r.price * 100),
            listed_at: r.date,
            source: r.source ?? 'cardsight',
          })),
      );
    }
  };
  // Ten writes in flight: a few thousand RPCs fit in the function's wall clock.
  for (let i = 0; i < plan.targets.length; i += 10) {
    await Promise.all(plan.targets.slice(i, i + 10).map(write));
  }

  for (const [reason, c] of coverage) {
    await supabase.rpc('record_price_coverage', {
      p_day: day,
      p_reason: reason,
      p_requested: c.requested,
      p_priced: c.priced,
      p_skipped: c.skipped,
    });
  }

  // The upstream counter lags by about a minute: the number we trust is ours.
  const usageAfter = (await provider.usage()) ?? null;
  if (settings.forceFullPass && fullPass) {
    const { data: current } = await supabase.from('app_settings').select('value').eq(
      'key',
      'price_source',
    ).maybeSingle();
    await supabase.from('app_settings').update({
      value: { ...((current?.value ?? {}) as Record<string, unknown>), force_full_pass: false },
      updated_at: new Date().toISOString(),
    }).eq('key', 'price_source');
  }
  await writeState(supabase, {
    ...state,
    last_run_day: day,
    last_full_pass_day: fullPass ? day : (state.last_full_pass_day ?? null),
    guard_emailed_month: emailed > 0 ? month : (state.guard_emailed_month ?? null),
    last_usage: Math.max(usageBefore + calls, usageAfter ?? 0),
  });

  const summary = Object.fromEntries(coverage);
  log('prices done', {
    provider: provider.name,
    mode,
    fullPass,
    calls,
    usageBefore,
    usageAfterEstimate: usageBefore + calls,
    priced: plan.targets.length - missing,
    changed,
    missing,
    kinds,
    failures: failures.length,
  });
  return {
    provider: provider.name,
    mode,
    full_pass: fullPass,
    usage_before: usageBefore,
    calls,
    usage_after_estimate: usageBefore + calls,
    usage_after_reported: usageAfter,
    quota: settings.monthlyQuota,
    targets: targets.length,
    planned: plan.targets.length,
    priced: plan.targets.length - missing,
    changed,
    missing,
    dropped: plan.dropped,
    unmapped: unmapped ?? null,
    kinds,
    failures: failures.slice(0, 20),
    emailed,
    duration_ms: Date.now() - startedAt,
    coverage: summary,
  };
}
