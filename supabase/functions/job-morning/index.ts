/**
 * job-morning: "Last night" push to every user with a push token and at least one followed
 * or owned player who played. Target 8:00 AM New York.
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve } from '../_shared/http.ts';
import { createPushProvider } from '../_shared/providers/index.ts';

serve(
  defineJob(
    { name: 'job-morning', targetHourEt: 8, dayOffset: -1 },
    async ({ supabase, day, log }) => {
      const { data: recipients, error: recipientsError } = await supabase.rpc(
        'morning_recipients',
        { p_day: day },
      );
      if (recipientsError) throw recipientsError;
      if (!recipients || recipients.length === 0) return { day, recipients: 0, sent: 0 };

      const push = createPushProvider();
      let sent = 0;
      let failed = 0;
      const invalid = new Set<string>();
      for (const r of recipients) {
        const change = Number(r.value_change_cents ?? 0);
        const changeText = change === 0
          ? 'your cards held steady'
          : `your cards ${change > 0 ? '+' : '-'}$${(Math.abs(change) / 100).toFixed(2)}`;
        const headline = r.headline_player && r.headline_points !== null
          ? `${r.headline_player}: ${r.headline_points} pts, ${changeText}`
          : `${r.players_count} of your players played, ${changeText}`;
        const result = await push.send([r.push_token], {
          title: 'Last night',
          body: headline,
          data: { route: '/last-night', day },
        });
        sent += result.sent;
        failed += result.failed;
        for (const t of result.invalidTokens) invalid.add(t);
      }
      if (invalid.size > 0) {
        await supabase.from('profiles').update({ push_token: null }).in('push_token', [...invalid]);
      }
      log('morning done', { recipients: recipients.length, sent, failed });
      return { day, recipients: recipients.length, sent, failed, invalidTokens: invalid.size };
    },
  ),
);
