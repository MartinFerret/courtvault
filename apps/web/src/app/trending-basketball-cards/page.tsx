import type { Metadata } from 'next';
import { PATHS } from '@/lib/paths';
import { formatEasternDay } from '@courtvault/shared';
import { LastNightView, lastNightTitle } from '@/components/last-night-page';
import { cardPublicSlugMap, playerPublicSlugMap } from '@/lib/data';
import { getLastNight } from '@/lib/last-night';
import { getFreshness } from '@/lib/freshness';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getLastNight();
  const day = data?.day;
  return {
    title: day ? lastNightTitle(day) : "Trending Basketball Cards: last night's movers",
    description: day
      ? `Biggest basketball card movers and performances of ${formatEasternDay(day)}: how median asking prices moved after the games.`
      : 'How basketball card prices move after each NBA night.',
    alternates: { canonical: PATHS.movers },
  };
}

export default async function LastNightLatestPage() {
  const data = await getLastNight();
  const freshness = await getFreshness().catch(() => null);
  if (!data || !data.day) {
    return (
      <>
        <h1>Trending basketball cards</h1>
        <p className="muted">
          No game night recorded yet. Come back after the first games of the season.
        </p>
      </>
    );
  }
  const [cards, players] = await Promise.all([cardPublicSlugMap(), playerPublicSlugMap()]);
  return (
    <LastNightView data={data} day={data.day} slugs={{ cards, players }} freshness={freshness} />
  );
}
