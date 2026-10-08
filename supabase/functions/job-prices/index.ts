/**
 * job-prices: a price for every (parallel, grade) that matters, in priority order.
 * With PRICE_PROVIDER=cardsight (the default since 2026-10-08) see cardsight-run.ts. Below, the
 * original per-query loop for eBay Browse (disabled) and the mock: median asking price
 * collections and alerts first, then the showcase (players who played last night, rookies,
 * top players). Stops at the daily call budget (app_settings.showcase.daily_call_budget) and
 * logs coverage per reason. Target 5:30 AM New York. Writes through record_price(), which
 * stores a history point only when the price changed.
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve, sleep } from '../_shared/http.ts';
import { createPriceProvider } from '../_shared/providers/index.ts';
import { env, priceProviderName } from '../_shared/env.ts';
import { runCardSightPricing } from './cardsight-run.ts';

interface Target {
  parallel_id: string;
  grade: 'RAW' | 'PSA9' | 'PSA10';
  parallel_name: string;
  serial_run: number | null;
  card_number: string;
  player_name: string;
  set_name: string;
  season: string;
  reason: string;
  priority: number;
  current_cents: number | null;
}

interface Coverage {
  requested: number;
  priced: number;
  skipped: number;
}

serve(
  defineJob(
    { name: 'job-prices', targetHourEt: 5, dayOffset: 0 },
    async (ctx) => {
      // CardSight (bulk, monthly quota) has its own run; eBay and the mock keep the per-query loop.
      if (priceProviderName() === 'cardsight') {
        const details = await runCardSightPricing(ctx);
        await revalidateWebsite(['prices', 'last-night']);
        return details;
      }
      const { supabase, day, log } = ctx;
      const { data: targets, error: targetsError } = await supabase.rpc('parallels_to_price', {
        p_rookie_limit: 50,
      });
      if (targetsError) throw targetsError;
      const list = (targets ?? []) as Target[];

      const { data: budgetValue } = await supabase.rpc('price_call_budget');
      const budget = Number(env('PRICE_CALL_BUDGET') ?? budgetValue ?? 3500);

      const provider = createPriceProvider(day);
      // Mock prices are for local development only: they must never reach a database that
      // feeds the public website (2026-10-08: a cloud run wrote 1,000 invented prices). The
      // local stack sets ALLOW_MOCK_PRICES=true in supabase/functions/.env.
      if (provider.name === 'mock' && env('ALLOW_MOCK_PRICES') !== 'true') {
        log('mock price provider without ALLOW_MOCK_PRICES: nothing written');
        return { status: 'skipped', reason: 'mock price provider' };
      }
      const capturedAt = new Date().toISOString();
      const coverage = new Map<string, Coverage>();
      const bump = (reason: string, key: keyof Coverage) => {
        const c = coverage.get(reason) ?? { requested: 0, priced: 0, skipped: 0 };
        c[key]++;
        coverage.set(reason, c);
      };

      let calls = 0;
      let changed = 0;
      let missing = 0;
      const failures: string[] = [];

      for (const t of list) {
        bump(t.reason, 'requested');
        if (calls >= budget) {
          bump(t.reason, 'skipped');
          continue;
        }
        calls++;
        try {
          const quote = await provider.quote({
            season: t.season,
            setName: t.set_name,
            playerName: t.player_name,
            cardNumber: t.card_number,
            parallelName: t.parallel_name,
            serialRun: t.serial_run,
            grade: t.grade,
            currentCents: t.current_cents,
          });
          if (!quote) {
            missing++;
            bump(t.reason, 'skipped');
            continue;
          }
          const { data: wrote, error: recordError } = await supabase.rpc('record_price', {
            p_parallel_id: t.parallel_id,
            p_grade: t.grade,
            p_source: quote.source,
            p_price_cents: quote.priceCents,
            p_sample_size: quote.sampleSize,
            p_buy_url: quote.buyUrl,
            p_captured_at: capturedAt,
          });
          if (recordError) throw recordError;
          bump(t.reason, 'priced');
          if (wrote) changed++;
        } catch (err) {
          bump(t.reason, 'skipped');
          failures.push(
            `${t.parallel_id}/${t.grade}: ${err instanceof Error ? err.message : String(err)}`,
          );
          if (failures.length > 20) {
            throw new Error(
              `Too many failures: ${failures.slice(0, 3).join('; ')}`,
            );
          }
        }
        if (provider.name !== 'mock') await sleep(200);
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
      const summary = Object.fromEntries(coverage);
      log('prices done', {
        provider: provider.name,
        targets: list.length,
        calls,
        budget,
        changed,
        missing,
        failures: failures.length,
        coverage: summary,
      });
      await revalidateWebsite(['prices', 'last-night']);
      return {
        provider: provider.name,
        targets: list.length,
        calls,
        budget,
        changed,
        missing,
        failures,
        coverage: summary,
      };
    },
  ),
);

/** Optional: tells the website to refresh price-dependent pages (on-demand ISR, no redeploy). */
async function revalidateWebsite(tags: string[]): Promise<void> {
  const url = env('WEB_REVALIDATE_URL');
  const secret = env('WEB_REVALIDATE_SECRET');
  if (!url || !secret) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags }),
    });
  } catch (err) {
    console.warn(`revalidate failed: ${err instanceof Error ? err.message : err}`);
  }
}
