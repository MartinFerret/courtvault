import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { Price, PriceNote } from '@/components/price';
import { getSet, indexStatus, listSets } from '@/lib/data';
import { PATHS, cardPath, checklistPath, playerPath } from '@/lib/paths';
import { absoluteUrl, robotsFor, seoTitle } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const sets = await listSets();
    return sets.map((s) => ({ slug: s.public_slug }));
  } catch (err) {
    console.warn(`generateStaticParams skipped: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/** Keyword of the page: "<season> <set> basketball checklist" (docs/keyword-map.csv). */
function keyword(set: { season: string; name: string }): string {
  // "Topps Basketball" already carries the word; "Topps Chrome" needs it.
  return `${set.season} ${set.name}${/basketball/i.test(set.name) ? '' : ' Basketball'} Checklist`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const set = await getSet(slug);
  if (!set) return { title: 'Checklist not found' };
  const status = await indexStatus('checklist', set.public_slug ?? set.slug);
  const rookies = set.cards.filter((c) => c.is_rookie).length;
  return {
    ...robotsFor(status.indexable),
    title: seoTitle(keyword(set), `${set.cards.length} cards, parallels, values`),
    description: `Full ${set.season} ${set.name}${/basketball/i.test(set.name) ? '' : ' basketball'} checklist: ${set.cards.length} cards, ${rookies} rookie cards, every parallel with its print run and median asking prices by grade.`,
    alternates: { canonical: checklistPath(set.public_slug ?? set.slug) },
    openGraph: { title: keyword(set), type: 'website' },
  };
}

export default async function ChecklistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const set = await getSet(slug);
  if (!set) notFound();
  const rookies = set.cards.filter((c) => c.is_rookie);
  const priced = set.cards.filter((c) => c.base_cents !== null);
  const top = [...priced].sort((a, b) => (b.base_cents ?? 0) - (a.base_cents ?? 0))[0];
  const name = `${set.season} ${set.name}`;
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: keyword(set),
          numberOfItems: set.cards.length,
          itemListElement: set.cards.slice(0, 50).map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `#${c.number} ${c.player?.name ?? ''}`,
            url: absoluteUrl(cardPath(c.public_slug)),
          })),
        }}
      />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Checklists', href: PATHS.checklists },
          { name, href: checklistPath(set.public_slug ?? set.slug) },
        ]}
      />
      <h1>
        {name}
        {/basketball/i.test(set.name) ? '' : ' basketball'} checklist
      </h1>
      <p className="lead">
        {name} has {set.cards.length} base cards
        {rookies.length > 0 ? `, ${rookies.length} of them rookie cards` : ''}
        {set.release_date ? `, released ${set.release_date}` : ''}.
        {priced.length > 0
          ? ` ${priced.length} cards have a current median asking price for the Base parallel, raw`
          : ''}
        {top && top.base_cents !== null ? (
          <>
            ; the highest is #{top.number} {top.player?.name} at <Price cents={top.base_cents} />.
          </>
        ) : (
          '.'
        )}{' '}
        Every parallel and print run is listed on each card page.
      </p>
      <PriceNote />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Team</th>
              <th className="num">Base, raw</th>
            </tr>
          </thead>
          <tbody>
            {set.cards.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.number}</td>
                <td>
                  <Link href={cardPath(c.public_slug)}>{c.player?.name}</Link>{' '}
                  {c.is_rookie ? <span className="badge">RC</span> : null}
                  {c.player ? (
                    <>
                      {' '}
                      <Link href={playerPath(c.player.public_slug)} className="muted small">
                        all cards
                      </Link>
                    </>
                  ) : null}
                </td>
                <td className="muted">{c.player?.team ?? '—'}</td>
                <td className="num">
                  <Price cents={c.base_cents} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AppCta context={`your ${name} cards`} />
    </>
  );
}
