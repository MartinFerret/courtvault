import type { MetadataRoute } from 'next';
import { listCardSlugs, listPlayers, listSets } from '@/lib/data';
import { listLastNightDays } from '@/lib/last-night';
import { SLUGS_FROZEN, absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

/**
 * R49: only pages meant to rank. Legal pages, the waitlist form and search stay out.
 * R50: lastmod is the last data change, never the build time.
 * Until the slugs are frozen (NEXT_PUBLIC_SLUGS_FROZEN), only the homepage is listed; every
 * other page is `noindex` through pendingRobots(). Phase 3 replaces the flat list with a
 * sitemap index split by type and the page_index_status view.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const nights = await listLastNightDays().catch(() => []);
  const latestNight = nights[0]?.game_day;
  // The homepage changes with each nightly update: the morning after the latest game night.
  const homeLastmod = latestNight ? new Date(`${latestNight}T13:00:00Z`) : undefined;
  const home: MetadataRoute.Sitemap = [{ url: absoluteUrl('/'), lastModified: homeLastmod }];
  if (!SLUGS_FROZEN) return home;

  const [sets, players, cards] = await Promise.all([listSets(), listPlayers(), listCardSlugs()]);
  return [
    ...home,
    { url: absoluteUrl('/rankings/rookies'), lastModified: homeLastmod },
    { url: absoluteUrl('/last-night'), lastModified: homeLastmod },
    ...nights.map((n) => ({
      url: absoluteUrl(`/last-night/${n.game_day}`),
      lastModified: new Date(`${n.game_day}T13:00:00Z`),
    })),
    { url: absoluteUrl('/sets'), lastModified: homeLastmod },
    { url: absoluteUrl('/players'), lastModified: homeLastmod },
    ...sets.map((s) => ({ url: absoluteUrl(`/sets/${s.slug}`), lastModified: homeLastmod })),
    ...players.map((p) => ({ url: absoluteUrl(`/players/${p.slug}`), lastModified: homeLastmod })),
    ...cards.map((c) => ({
      url: absoluteUrl(`/cards/${c.slug}`),
      lastModified: c.updated ? new Date(c.updated) : homeLastmod,
    })),
  ];
}
