import type { Metadata } from 'next';
import { formatEasternDay } from '@courtvault/shared';
import { LastNightView, lastNightTitle } from '@/components/last-night-page';
import { getLastNight } from '@/lib/last-night';
import { pendingRobots } from '@/lib/site';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getLastNight();
  const day = data?.day;
  return {
    ...pendingRobots(),
    title: day ? lastNightTitle(day) : 'Last night in the card market',
    description: day
      ? `Biggest basketball card movers and performances of ${formatEasternDay(day)}: how median asking prices moved after the games.`
      : 'How basketball card prices move after each NBA night.',
    alternates: { canonical: '/last-night' },
  };
}

export default async function LastNightLatestPage() {
  const data = await getLastNight();
  if (!data || !data.day) {
    return (
      <>
        <h1>Last night in the card market</h1>
        <p className="muted">
          No game night recorded yet. Come back after the first games of the season.
        </p>
      </>
    );
  }
  return <LastNightView data={data} day={data.day} />;
}
