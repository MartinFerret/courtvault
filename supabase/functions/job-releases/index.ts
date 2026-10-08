/**
 * job-releases: once a day, read Topps' official checklists page and record any new basketball
 * set as an announced release (placeholder checklist page on the website). When robots.txt
 * disallows the page or the request is refused, nothing is retried or worked around: the status
 * is stored and Martin is emailed (at most once a week per status) to check the page by hand.
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve } from '../_shared/http.ts';
import { env, requireEnv } from '../_shared/env.ts';
import { createEmailProvider } from '../_shared/providers/index.ts';
import {
  botUserAgent,
  findBasketballSets,
  robotsDisallows,
  TOPPS_CHECKLISTS_URL,
  TOPPS_ROBOTS_URL,
} from '../_shared/releases.ts';

interface CheckState {
  status?: string;
  checked_at?: string;
  notified_at?: string;
  notified_status?: string;
  found?: string[];
}

const NOTIFY_EVERY_MS = 7 * 24 * 3600 * 1000;

async function fetchOnce(url: string, userAgent: string): Promise<Response> {
  return await fetch(url, {
    headers: { 'user-agent': userAgent, accept: 'text/html,text/plain' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
}

serve(
  defineJob({ name: 'job-releases', targetHourEt: 8 }, async ({ supabase, log }) => {
    const contact = env('EMAIL_ADMIN') ?? 'hello@hoopticker.com';
    const userAgent = botUserAgent(contact);
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'topps_release_check')
      .maybeSingle();
    const state = ((setting?.value as CheckState | null) ?? {}) as CheckState;

    let status: string;
    let found: string[] = [];
    let newSets: { slug: string; name: string; season: string }[] = [];
    try {
      const robots = await fetchOnce(TOPPS_ROBOTS_URL, userAgent);
      if (!robots.ok) {
        status = `blocked:${robots.status}`;
      } else if (robotsDisallows(await robots.text(), '/pages/checklists')) {
        status = 'disallowed';
      } else {
        const page = await fetchOnce(TOPPS_CHECKLISTS_URL, userAgent);
        if (!page.ok) {
          status = `blocked:${page.status}`;
        } else {
          status = 'ok';
          const sets = findBasketballSets(await page.text());
          found = sets.map((s) => s.slug);
          const [{ data: known }, { data: imported }] = await Promise.all([
            supabase.from('set_releases').select('slug'),
            supabase.from('card_sets').select('slug'),
          ]);
          const seen = new Set([...(known ?? []), ...(imported ?? [])].map((r) => r.slug));
          newSets = sets.filter((s) => !seen.has(s.slug));
          if (newSets.length > 0) {
            const { error } = await supabase.from('set_releases').insert(
              newSets.map((s) => ({
                slug: s.slug,
                public_slug: s.slug,
                name: s.name,
                season: s.season,
                source_url: TOPPS_CHECKLISTS_URL,
                notes: 'Spotted by job-releases; release date and box configuration to confirm.',
              })),
            );
            if (error) throw error;
          }
        }
      }
    } catch (err) {
      status = `error:${err instanceof Error ? err.message : String(err)}`.slice(0, 120);
    }
    log('release check', { status, found: found.length, new: newSets.length });

    // Notify Martin: every new set immediately; a blocked or disallowed page at most once a week.
    const now = new Date();
    const lastNotified = state.notified_at ? new Date(state.notified_at).getTime() : 0;
    const problem = status !== 'ok';
    const shouldNotify = newSets.length > 0 ||
      (problem &&
        (state.notified_status !== status || now.getTime() - lastNotified > NOTIFY_EVERY_MS));
    let emailed = 0;
    if (shouldNotify && env('EMAIL_ADMIN')) {
      const subject = newSets.length > 0
        ? `New Topps basketball set announced: ${
          newSets.map((s) => `${s.season} ${s.name}`).join(', ')
        }`
        : `Topps checklist page not readable (${status}), please check manually`;
      const text = newSets.length > 0
        ? `job-releases found on ${TOPPS_CHECKLISTS_URL}:\n${
          newSets.map((s) =>
            `- ${s.season} ${s.name} (placeholder at https://hoopticker.com/checklists/${s.slug})`
          ).join('\n')
        }\n\nEnter the release date and box configuration in set_releases, then import the checklist.`
        : `job-releases could not read ${TOPPS_CHECKLISTS_URL} today (${status}). Nothing was retried. Please open the page yourself and add any new basketball set to set_releases.`;
      const result = await createEmailProvider().send([
        {
          to: requireEnv('EMAIL_ADMIN'),
          subject,
          text,
          html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
          tag: 'releases',
        },
      ]);
      emailed = result.sent;
    }

    const next: CheckState = {
      status,
      checked_at: now.toISOString(),
      found,
      notified_at: emailed > 0 ? now.toISOString() : state.notified_at,
      notified_status: emailed > 0 ? status : state.notified_status,
    };
    const { error: saveError } = await supabase
      .from('app_settings')
      .upsert({ key: 'topps_release_check', value: next, updated_at: now.toISOString() });
    if (saveError) throw saveError;
    return { status, found: found.length, new: newSets.length, emailed };
  }),
);
