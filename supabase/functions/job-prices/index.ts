/**
 * job-prices: median asking price for every (parallel, grade) in a collection or alert,
 * plus the top rookie cards. Target 5:30 AM New York. Writes through record_price(), which
 * stores a history point only when the price changed.
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve, sleep } from '../_shared/http.ts';
import { createPriceProvider } from '../_shared/providers/index.ts';
import { env } from '../_shared/env.ts';

serve(
  defineJob(
    { name: 'job-prices', targetHourEt: 5, dayOffset: 0 },
    async ({ supabase, day, log }) => {
      const { data: targets, error: targetsError } = await supabase.rpc('parallels_to_price', {
        p_rookie_limit: 50,
      });
      if (targetsError) throw targetsError;

      const provider = createPriceProvider(day);
      const capturedAt = new Date().toISOString();
      let quoted = 0;
      let changed = 0;
      let missing = 0;
      const failures: string[] = [];

      for (const t of targets ?? []) {
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
          quoted++;
          if (wrote) changed++;
        } catch (err) {
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

      log('prices done', {
        provider: provider.name,
        quoted,
        changed,
        missing,
        failures: failures.length,
      });
      await revalidateWebsite(['prices', 'last-night']);
      return {
        provider: provider.name,
        targets: targets?.length ?? 0,
        quoted,
        changed,
        missing,
        failures,
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
