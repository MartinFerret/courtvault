import type { MetadataRoute } from 'next';
import { listCardSlugs, listPlayers, listSets } from '@/lib/data';
import { listLastNightDays } from '@/lib/last-night';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sets, players, cards, nights] = await Promise.all([listSets(), listPlayers(), listCardSlugs(), listLastNightDays()]);
  const now = new Date();
  return [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/rankings/rookies'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/last-night'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...nights.map((n) => ({ url: absoluteUrl(`/last-night/${n.game_day}`), lastModified: new Date(`${n.game_day}T13:00:00Z`), changeFrequency: 'monthly' as const, priority: 0.6 })),
    { url: absoluteUrl('/sets'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/players'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/waitlist'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/legal/terms'), changeFrequency: 'yearly', priority: 0.1 },
    { url: absoluteUrl('/legal/privacy'), changeFrequency: 'yearly', priority: 0.1 },
    { url: absoluteUrl('/legal/account-deletion'), changeFrequency: 'yearly', priority: 0.1 },
    ...sets.map((s) => ({ url: absoluteUrl(`/sets/${s.slug}`), lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...players.map((p) => ({ url: absoluteUrl(`/players/${p.slug}`), lastModified: now, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...cards.map((c) => ({ url: absoluteUrl(`/cards/${c.slug}`), lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 })),
  ];
}
