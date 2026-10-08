/**
 * job-morning: "Last night" push to every user with a push token, then the email digest
 * (daily for Premium, weekly for free users) within the daily email budget. Target 8:00 AM
 * New York.
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve } from '../_shared/http.ts';
import { emailDailyBudget, env, requireEnv } from '../_shared/env.ts';
import { createEmailProvider, createPushProvider } from '../_shared/providers/index.ts';
import { formatEasternDay } from '../_shared/dates.ts';
import { buildDigest, type DigestRow, movementText, type VaultScoreSummary } from './digest.ts';

serve(
  defineJob(
    { name: 'job-morning', targetHourEt: 8, dayOffset: -1 },
    async ({ supabase, day, log }) => {
      // Vault Score of the night, one summary per user who had a lineup (empty when off).
      const { data: scores, error: scoresError } = await supabase.rpc('vault_score_morning', {
        p_day: day,
      });
      if (scoresError) throw scoresError;
      const vault = new Map<string, VaultScoreSummary>(
        (scores ?? []).map((s: { user_id: string; summary: VaultScoreSummary }) => [
          s.user_id,
          s.summary,
        ]),
      );

      // 1. Push notifications
      const { data: recipients, error: recipientsError } = await supabase.rpc(
        'morning_recipients',
        { p_day: day },
      );
      if (recipientsError) throw recipientsError;

      const push = createPushProvider();
      let sent = 0;
      let failed = 0;
      const invalid = new Set<string>();
      for (const r of recipients ?? []) {
        const change = Number(r.value_change_cents ?? 0);
        const changeText = change === 0
          ? 'your cards held steady'
          : `your cards ${change > 0 ? '+' : '-'}$${(Math.abs(change) / 100).toFixed(2)}`;
        const v = vault.get(r.user_id);
        const move = v?.counts ? movementText(v.movement) : null;
        const headline = v
          ? `Your lineup scored ${v.total} pts last night${
            v.top ? `, ${v.top.name} led the way` : ''
          }${move && v.rank !== null ? `. Week rank ${v.rank}, ${move}` : ''}.`
          : r.headline_player && r.headline_points !== null
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

      // 2. Email digest
      const email = await sendDigests(supabase, day, log, vault);

      log('morning done', { recipients: (recipients ?? []).length, sent, failed, ...email });
      return {
        day,
        recipients: (recipients ?? []).length,
        sent,
        failed,
        invalidTokens: invalid.size,
        email,
      };
    },
  ),
);

async function sendDigests(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  day: string,
  log: (message: string, extra?: Record<string, unknown>) => void,
  vault: Map<string, VaultScoreSummary>,
): Promise<Record<string, number>> {
  const { data: rows, error } = await supabase.rpc('morning_email_recipients', { p_day: day });
  if (error) throw error;
  const due = (rows ?? []).filter((r: { due: boolean }) => r.due);
  const budget = emailDailyBudget();
  const batch = due.slice(0, budget);
  const skippedBudget = due.length - batch.length;
  if (batch.length === 0) {
    return { emailDue: due.length, emailSent: 0, emailFailed: 0, emailSkippedBudget: 0 };
  }

  const provider = createEmailProvider();
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const webAppUrl = env('WEB_APP_URL') ?? 'https://app.hoopticker.com';
  const siteUrl = env('SITE_URL') ?? 'https://hoopticker.com';
  const postalAddress = env('EMAIL_POSTAL_ADDRESS') ??
    'HoopTicker (Martin Ferret), 9 rue des Érables, 45250 Briare, France';
  const dayLabel = formatEasternDay(day);

  let emailSent = 0;
  let emailFailed = 0;
  for (const r of batch) {
    const { data: report, error: reportError } = await supabase.rpc('morning_report_for', {
      p_uid: r.user_id,
      p_day: day,
    });
    if (reportError) {
      emailFailed++;
      continue;
    }
    const message = buildDigest({
      to: r.email,
      day,
      dayLabel,
      frequency: r.effective_frequency === 'daily' ? 'daily' : 'weekly',
      isPremium: !!r.is_premium,
      rows: (report ?? []) as DigestRow[],
      unsubscribeUrl:
        `${supabaseUrl}/functions/v1/unsubscribe?token=${r.unsubscribe_token}&scope=digest`,
      webAppUrl,
      siteUrl,
      postalAddress,
      vaultScore: vault.get(r.user_id) ?? null,
    });
    const result = await provider.send([message]);
    emailSent += result.sent;
    emailFailed += result.failed;
    if (result.invalid.length > 0) {
      await supabase.from('profiles').update({ digest_frequency: 'off' }).eq('id', r.user_id);
    }
  }
  if (skippedBudget > 0) log('email budget reached', { skippedBudget, budget });
  return { emailDue: due.length, emailSent, emailFailed, emailSkippedBudget: skippedBudget };
}
