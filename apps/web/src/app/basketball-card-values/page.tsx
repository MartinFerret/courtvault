import Link from 'next/link';
import type { Metadata } from 'next';
import { PRICE_LABEL } from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { EmptyState } from '@/components/empty-state';
import { FreshnessLine } from '@/components/freshness';
import { Price, PriceNote } from '@/components/price';
import { listSets, pricesAvailable, topValues } from '@/lib/data';
import { getFreshness } from '@/lib/freshness';
import { PATHS, cardPath, checklistPath } from '@/lib/paths';
import { robotsFor, seoTitle } from '@/lib/site';

export const revalidate = 3600;

// Keyword "basketball card values" (docs/keyword-map.csv, audit item 8). The homepage keeps the
// app query; this hub is the price-guide entry point and is indexable once prices exist.
export async function generateMetadata(): Promise<Metadata> {
  const priced = await pricesAvailable().catch(() => false);
  return {
    ...robotsFor(priced),
    title: seoTitle('Basketball Card Values', 'by set, parallel and grade'),
    description:
      'Basketball card values from eBay sales and listings: the highest priced cards right now, every Topps checklist with print runs, and the rookie ranking. Refreshed nightly.',
    alternates: { canonical: PATHS.values },
  };
}

export default async function ValuesHubPage() {
  const [top, sets, freshness] = await Promise.all([
    topValues(12).catch(() => []),
    listSets(),
    getFreshness().catch(() => null),
  ]);
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Basketball card values', href: PATHS.values },
        ]}
      />
      <h1>Basketball card values</h1>
      <p className="lead">
        What Topps basketball cards are worth right now, by set, parallel and grade: recent eBay
        auction sales when there are enough, otherwise current asking prices, each value labelled,
        refreshed every night next to the box scores. Open a checklist for every card of a set, a
        player page for every card of a player.
      </p>
      <FreshnessLine data={freshness} />

      <section className="section">
        <h2>Highest values right now</h2>
        {top.length > 0 ? (
          <>
            <PriceNote />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Parallel</th>
                    <th className="num">{PRICE_LABEL}, raw</th>
                    <th className="num">Listings</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((v) => (
                    <tr key={`${v.card.public_slug}-${v.parallel_name}`}>
                      <td>
                        <Link href={cardPath(v.card.public_slug)}>
                          #{v.card.number} {v.card.players?.name}
                        </Link>{' '}
                        <span className="muted small">
                          {v.card.card_sets?.season} {v.card.card_sets?.name}
                          {v.card.is_rookie ? ' RC' : ''}
                        </span>
                      </td>
                      <td>
                        {v.parallel_name}
                        {v.serial_run ? ` /${v.serial_run}` : ''}
                      </td>
                      <td className="num">
                        <Price cents={v.price_cents} />
                      </td>
                      <td className="num">{v.sample_size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState title="Values start with the regular season.">
            The catalog is complete; values are collected nightly once the price source is live.
            Checklists and player pages already list every card and parallel.
          </EmptyState>
        )}
      </section>

      <section className="section">
        <h2>Values by set</h2>
        <ul className="hub-list">
          {sets.map((s) => (
            <li key={s.id}>
              <Link href={checklistPath(s.public_slug)}>
                {s.season} {s.name} checklist
              </Link>
              <span className="muted small">{s.card_count} cards</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Go further</h2>
        <ul className="hub-list">
          <li>
            <Link href={PATHS.rookies}>Most valuable basketball rookie cards</Link>
            <span className="muted small">2025-26 rookies ranked by market value</span>
          </li>
          <li>
            <Link href={PATHS.movers}>Trending basketball cards</Link>
            <span className="muted small">what moved after last night&apos;s games</span>
          </li>
          <li>
            <Link href={PATHS.players}>NBA player cards</Link>
            <span className="muted small">every player, every card, by set</span>
          </li>
          <li>
            <Link href={PATHS.method}>How we price cards</Link>
            <span className="muted small">
              auction sales, asking prices, thresholds, update schedule
            </span>
          </li>
        </ul>
      </section>

      <AppCta context="the value of your own cards" />
    </>
  );
}
