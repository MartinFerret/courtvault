import type { Metadata } from 'next';
import { PATHS, moversPath } from '@/lib/paths';
import { notFound } from 'next/navigation';
import { formatEasternDay } from '@courtvault/shared';
import { LastNightView, lastNightTitle } from '@/components/last-night-page';
import { cardPublicSlugMap, playerPublicSlugMap } from '@/lib/data';
import { getLastNight, listLastNightDays } from '@/lib/last-night';

export const revalidate = 86400;
export const dynamicParams = true;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function generateStaticParams() {
  try {
    const days = await listLastNightDays();
    return days.slice(0, 30).map((d) => ({ date: d.game_day }));
  } catch (err) {
    console.warn(`generateStaticParams skipped: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!DAY.test(date)) return { title: 'Not found' };
  return {
    title: lastNightTitle(date),
    description: `Biggest basketball card movers and performances of ${formatEasternDay(date)}: how median asking prices moved after the games.`,
    alternates: { canonical: moversPath(date) },
    openGraph: { type: 'article', title: lastNightTitle(date) },
  };
}

export default async function LastNightArchivePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!DAY.test(date)) notFound();
  const data = await getLastNight(date);
  if (!data || !data.day) notFound();
  const [cards, players] = await Promise.all([cardPublicSlugMap(), playerPublicSlugMap()]);
  return <LastNightView data={data} day={data.day} slugs={{ cards, players }} />;
}
