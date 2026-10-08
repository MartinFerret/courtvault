/**
 * job-catalog-map: maps our catalog (sets, cards, parallel names) to CardSight ids.
 *
 * Run by hand after an import (`pnpm job:map -- --force`), not scheduled. About 45 calls for
 * the nine 2025-26 sets. Stores ids only: which of their releases, base sets, cards and
 * parallels correspond to ours. Their lists are not copied into our catalog (ToS §3(b)(14)),
 * so a parallel we do not have stays absent, and a parallel they do not have is reported.
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve } from '../_shared/http.ts';
import {
  CardSightClient,
  type CardSightParallel,
  normalizeName,
} from '../_shared/providers/cardsight.ts';

/** Our set slug suffix (after the season) to CardSight's release name when they differ. */
const RELEASE_ALIASES: Record<string, string> = {
  'topps-basketball': 'Topps',
  'topps-hoops': 'NBA Hoops',
  'topps-chrome-updates': 'Topps Chrome Update',
  'topps-finest': 'Finest',
};

interface OurSet {
  id: string;
  name: string;
  slug: string;
  season: string;
}

interface SetReport {
  set: string;
  release: string | null;
  base_set: string | null;
  cards_ours: number;
  cards_matched: number;
  cards_missing: string[];
  parallels_ours: number;
  parallels_matched: number;
  parallels_unmatched: string[];
}

/** Our parallel name against theirs: exact, then with "Refractor" added or removed. */
function matchParallel(ours: string, theirs: CardSightParallel[]): CardSightParallel | null {
  const n = normalizeName(ours);
  const candidates = [n, `${n}refractor`, n.replace(/refractor$/, '')];
  for (const c of candidates) {
    const hit = theirs.find((p) => normalizeName(p.name) === c);
    if (hit) return hit;
  }
  return null;
}

serve(
  defineJob({ name: 'job-catalog-map', targetHourEt: 0 }, async ({ supabase, log }) => {
    const client = new CardSightClient();
    const { data: sets, error: setsError } = await supabase
      .from('card_sets')
      .select('id, name, slug, season')
      .order('season')
      .order('name');
    if (setsError) throw setsError;
    const ourSets = (sets ?? []) as OurSet[];
    const seasons = [...new Set(ourSets.map((s) => s.season))].sort();
    const minYear = seasons[0]?.slice(0, 4) ?? '2025';

    const { releases } = await client.listReleases({ segment: 'basketball', minYear });
    const reports: SetReport[] = [];

    for (const set of ourSets) {
      const suffix = set.slug.replace(`${set.season}-`, '');
      const wanted = normalizeName(RELEASE_ALIASES[suffix] ?? set.name);
      const release = releases.find((r) =>
        normalizeName(r.name) === wanted && (r.year ?? '').startsWith(set.season.slice(0, 4))
      );
      const report: SetReport = {
        set: `${set.season} ${set.name}`,
        release: release ? `${release.year} ${release.name}` : null,
        base_set: null,
        cards_ours: 0,
        cards_matched: 0,
        cards_missing: [],
        parallels_ours: 0,
        parallels_matched: 0,
        parallels_unmatched: [],
      };
      reports.push(report);

      const { data: ourCards } = await supabase.from('cards').select('id, number').eq(
        'set_id',
        set.id,
      );
      const cards = (ourCards ?? []) as { id: string; number: string }[];
      report.cards_ours = cards.length;
      const { data: ourParallels } = await supabase
        .from('parallels')
        .select('name, cards!inner(set_id)')
        .eq('cards.set_id', set.id);
      const parallelNames = [...new Set((ourParallels ?? []).map((p) => p.name as string))].filter((
        n,
      ) => n !== 'Base');
      report.parallels_ours = parallelNames.length;

      if (!release) {
        log('no release', { set: report.set });
        continue;
      }

      const { sets: theirSets } = await client.listSets(release.id);
      const base = theirSets.find((s) => normalizeName(s.name) === 'baseset') ??
        theirSets.find((s) => s.cardCount === cards.length) ?? null;
      if (!base) {
        log('no base set', { set: report.set });
        continue;
      }
      report.base_set = `${base.name} (${base.cardCount ?? '?'} cards)`;
      await supabase.from('cardsight_sets').upsert({
        set_id: set.id,
        release_id: release.id,
        release_name: release.name,
        base_set_id: base.id,
        base_set_card_count: base.cardCount ?? null,
        mapped_at: new Date().toISOString(),
      });

      // Cards, by number within the base set.
      const theirCards = await client.listSetCards(base.id);
      const byNumber = new Map(theirCards.map((c) => [String(c.number).trim().toUpperCase(), c]));
      const rows = [];
      for (const card of cards) {
        const hit = byNumber.get(String(card.number).trim().toUpperCase());
        if (!hit) {
          report.cards_missing.push(card.number);
          continue;
        }
        rows.push({
          card_id: card.id,
          cardsight_card_id: hit.id,
          matched_by: 'number',
          mapped_at: new Date().toISOString(),
        });
      }
      report.cards_matched = rows.length;
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from('cardsight_cards').upsert(rows.slice(i, i + 500));
        if (error) throw error;
      }

      // Parallels we already have, by name, against the base set's parallels.
      if (parallelNames.length > 0) {
        const detail = await client.getSet(base.id);
        const theirs = detail.parallels ?? [];
        const matched = [];
        for (const name of parallelNames) {
          const hit = matchParallel(name, theirs);
          if (hit) {
            matched.push({
              set_id: set.id,
              name,
              cardsight_parallel_id: hit.id,
              mapped_at: new Date().toISOString(),
            });
          } else report.parallels_unmatched.push(name);
        }
        report.parallels_matched = matched.length;
        if (matched.length > 0) {
          const { error } = await supabase.from('cardsight_parallels').upsert(matched);
          if (error) throw error;
        }
      }
    }

    // PSA 9 and PSA 10 ids, once.
    const grades = await client.psaGradeIds();
    if (grades) {
      await supabase.from('app_settings').upsert({
        key: 'cardsight_grades',
        value: grades,
        description: 'CardSight grade ids for PSA9 and PSA10, filled by job-catalog-map',
        updated_at: new Date().toISOString(),
      });
    }

    const totals = {
      sets_mapped: reports.filter((r) => r.base_set).length,
      sets_total: reports.length,
      cards_matched: reports.reduce((n, r) => n + r.cards_matched, 0),
      cards_total: reports.reduce((n, r) => n + r.cards_ours, 0),
      parallels_matched: reports.reduce((n, r) => n + r.parallels_matched, 0),
      parallels_total: reports.reduce((n, r) => n + r.parallels_ours, 0),
      grades: grades ? Object.keys(grades) : [],
      calls: client.calls,
    };
    log('catalog mapped', totals);
    return { ...totals, sets: reports };
  }),
);
