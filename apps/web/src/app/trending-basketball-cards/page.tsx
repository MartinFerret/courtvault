import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { TrendingHub } from '@/components/trending-hub';
import { cardPublicSlugMap, playerPublicSlugMap } from '@/lib/data';
import { getFreshness } from '@/lib/freshness';
import { getLastNight, getMoversWindow } from '@/lib/last-night';
import { PATHS } from '@/lib/paths';
import { seoTitle } from '@/lib/site';

export const revalidate = 3600;

// Keyword "trending basketball cards" (docs/keyword-map.csv). The dated pages carry each night;
// this page carries the week and the archive, so the two never duplicate (audit 4.5).
export const metadata: Metadata = {
  title: seoTitle('Trending Basketball Cards', "last night's movers"),
  description:
    'Basketball cards whose values moved after the games: last night in short, the movers of the last seven nights, and every past night.',
  alternates: { canonical: PATHS.movers },
};

export default async function TrendingPage() {
  const [latest, window, freshness, cards, players] = await Promise.all([
    getLastNight().catch(() => null),
    getMoversWindow(7).catch(() => null),
    getFreshness().catch(() => null),
    cardPublicSlugMap(),
    playerPublicSlugMap(),
  ]);
  return (
    <>
      <TrendingHub
        latest={latest}
        window={window}
        freshness={freshness}
        slugs={{ cards, players }}
      />
      <AppCta context="what the last nights did to YOUR collection" />
    </>
  );
}
