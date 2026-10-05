/**
 * job-alerts: fires price alerts whose target has been reached. Target 6:00 AM New York.
 * An alert fires once (triggered_at); the user re-arms it from the app.
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve } from '../_shared/http.ts';
import { createPushProvider } from '../_shared/providers/index.ts';

serve(
  defineJob({ name: 'job-alerts', targetHourEt: 6, dayOffset: 0 }, async ({ supabase, log }) => {
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select(
        'id, user_id, parallel_id, grade, below_cents, parallels(name, serial_run, cards(number, players(name)))',
      )
      .is('triggered_at', null);
    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) return { checked: 0, fired: 0 };

    const pairs = [...new Set(alerts.map((a) => `${a.parallel_id}:${a.grade}`))];
    const { data: prices, error: pricesError } = await supabase
      .from('current_prices')
      .select('parallel_id, grade, price_cents')
      .in('parallel_id', [...new Set(alerts.map((a) => a.parallel_id))]);
    if (pricesError) throw pricesError;
    const priceByPair = new Map(
      prices?.map((p) => [`${p.parallel_id}:${p.grade}`, p.price_cents]) ?? [],
    );

    const due = alerts.filter((a) => {
      const price = priceByPair.get(`${a.parallel_id}:${a.grade}`);
      return price !== undefined && price <= a.below_cents;
    });
    if (due.length === 0) return { checked: alerts.length, pairs: pairs.length, fired: 0 };

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, push_token')
      .in('id', [...new Set(due.map((a) => a.user_id))]);
    const tokenByUser = new Map(profiles?.map((p) => [p.id, p.push_token]) ?? []);

    const push = createPushProvider();
    let sent = 0;
    const invalid = new Set<string>();
    for (const alert of due) {
      const parallel = alert.parallels as unknown as {
        name: string;
        serial_run: number | null;
        cards: { number: string; players: { name: string } | null } | null;
      } | null;
      const price = priceByPair.get(`${alert.parallel_id}:${alert.grade}`)!;
      const label = `${parallel?.cards?.players?.name ?? 'Card'} #${
        parallel?.cards?.number ?? ''
      } ${parallel?.name ?? ''}`.trim();
      const token = tokenByUser.get(alert.user_id);
      if (token) {
        const result = await push.send([token], {
          title: 'Price alert',
          body: `${label} (${alert.grade}) is now $${(price / 100).toFixed(2)}, below your $${
            (alert.below_cents / 100).toFixed(2)
          } target.`,
          data: { route: `/card/${alert.parallel_id}`, grade: alert.grade },
        });
        sent += result.sent;
        for (const t of result.invalidTokens) invalid.add(t);
      }
      await supabase.from('price_alerts').update({ triggered_at: new Date().toISOString() }).eq(
        'id',
        alert.id,
      );
    }
    if (invalid.size > 0) {
      await supabase.from('profiles').update({ push_token: null }).in('push_token', [...invalid]);
    }
    log('alerts done', { checked: alerts.length, fired: due.length, sent });
    return {
      checked: alerts.length,
      pairs: pairs.length,
      fired: due.length,
      sent,
      invalidTokens: invalid.size,
    };
  }),
);
