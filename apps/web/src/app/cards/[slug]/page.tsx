import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { GRADE_LABELS, formatParallel } from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { foilProps } from '@/components/foil';
import { JsonLd } from '@/components/json-ld';
import { Price, PriceNote } from '@/components/price';
import { CardVisual } from '@/components/card-visual';
import { EmptyState } from '@/components/empty-state';
import { ImageCredit } from '@/components/image-credit';
import { PriceHistory } from '@/components/price-history';
import { cardImage } from '@/lib/images';
import {
  getCard,
  getPlayer,
  getPriceHistory,
  indexStatus,
  listCardSlugs,
  setNeighbours,
} from '@/lib/data';
import { PATHS, cardPath, checklistPath, playerPath } from '@/lib/paths';
import { absoluteUrl, robotsFor, seoTitle } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const cards = await listCardSlugs();
    return cards.map((c) => ({ slug: c.slug }));
  } catch (err) {
    console.warn(`generateStaticParams skipped: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/** "<season> <set> <player> rookie card #<n>" (docs/keyword-map.csv). */
function keyword(card: {
  set: { season: string; name: string };
  player: { name: string };
  is_rookie: boolean;
  number: string;
}): string {
  return `${card.set.season} ${card.set.name} ${card.player.name} ${card.is_rookie ? 'Rookie Card' : 'Card'} #${card.number}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card) return { title: 'Card not found' };
  const status = await indexStatus('card', card.public_slug);
  const base = card.parallels
    .find((p) => p.name === 'Base')
    ?.prices.find((pr) => pr.grade === 'RAW');
  const description = `${card.player.name} ${card.set.season} ${card.set.name} #${card.number}: ${card.parallels.length} parallels with print runs, median asking prices raw, PSA 9 and PSA 10${base ? `, Base raw at $${(base.price_cents / 100).toFixed(2)}` : ''}.`;
  return {
    ...robotsFor(status.indexable),
    // The keyword alone already fills the title (set, player, card number).
    title: seoTitle(keyword(card), ''),
    description:
      description.length > 155
        ? `${description.slice(0, 152).replace(/,[^,]*$/, '')}.`
        : description,
    alternates: { canonical: cardPath(card.public_slug) },
    openGraph: { title: keyword(card), type: 'website' },
  };
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card) notFound();
  if (card.public_slug !== slug) permanentRedirect(cardPath(card.public_slug));
  const name = `${card.set.season} ${card.set.name} ${card.player.name} ${card.is_rookie ? 'rookie card' : 'card'} #${card.number}`;
  const [history, playerFull, neighbours] = await Promise.all([
    getPriceHistory(card.public_slug).catch(() => []),
    getPlayer(card.player.public_slug).catch(() => null),
    setNeighbours(card.set.id, card.number).catch(() => []),
  ]);
  const related = (playerFull?.cards ?? []).filter((c) => c.id !== card.id).slice(0, 4);
  const allPrices = card.parallels.flatMap((p) => p.prices.map((pr) => pr.price_cents));
  const priced = card.parallels.filter((p) => p.prices.length > 0);
  const numbered = card.parallels.filter((p) => p.serial_run !== null);
  const top = priced
    .map((p) => ({ p, max: Math.max(...p.prices.map((pr) => pr.price_cents)) }))
    .sort((a, b) => b.max - a.max)[0];
  const base = card.parallels.find((p) => p.name === 'Base');
  const baseRaw = base?.prices.find((pr) => pr.grade === 'RAW');
  const basePsa10 = base?.prices.find((pr) => pr.grade === 'PSA10');
  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: `${card.player.name} basketball trading card, ${card.set.season} ${card.set.name}, card #${card.number}.`,
    url: absoluteUrl(cardPath(card.public_slug)),
    category: 'Sports Trading Card Singles',
    ...(allPrices.length > 0
      ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: (Math.min(...allPrices) / 100).toFixed(2),
            highPrice: (Math.max(...allPrices) / 100).toFixed(2),
            offerCount: card.parallels.reduce(
              (n, p) => n + p.prices.reduce((m, pr) => m + pr.sample_size, 0),
              0,
            ),
            availability: 'https://schema.org/InStock',
            description: 'Median asking prices from active eBay listings, by parallel and grade.',
          },
        }
      : {}),
  };
  return (
    <>
      <JsonLd data={product} />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Checklists', href: PATHS.checklists },
          {
            name: `${card.set.season} ${card.set.name}`,
            href: checklistPath(card.set.public_slug),
          },
          { name: `#${card.number} ${card.player.name}`, href: cardPath(card.public_slug) },
        ]}
      />
      <header className="chero">
        <div className="chero__visual">
          <CardVisual
            publicSlug={card.public_slug}
            name={name}
            number={card.number}
            player={card.player.name}
            setLabel={`${card.set.season} ${card.set.name}`}
            isRookie={card.is_rookie}
            size="large"
            priority
          />
        </div>
        <div className="chero__copy">
          <p className="chero__set">
            <Link href={checklistPath(card.set.public_slug)}>
              {card.set.season} {card.set.name} checklist
            </Link>
          </p>
          <h1 className="chero__title">
            {card.set.season} {card.set.name} {card.player.name}{' '}
            {card.is_rookie ? 'rookie card' : 'card'} #{card.number}
          </h1>
          <p className="chero__meta">
            <span className="plaque__number">#{card.number}</span>
            {card.is_rookie ? <span className="badge">RC</span> : null}
            <Link href={playerPath(card.player.public_slug)}>
              {card.player.name} {card.is_rookie ? 'rookie cards' : 'cards'}
            </Link>
            {card.player.team ? <span className="muted">{card.player.team}</span> : null}
          </p>
          <p className="lead">
            {card.parallels.length} parallels, {numbered.length} of them numbered
            {numbered.length > 0
              ? ` (from /${Math.max(...numbered.map((p) => p.serial_run ?? 0))} down to ${numbered.some((p) => p.serial_run === 1) ? '1 of 1' : `/${Math.min(...numbered.map((p) => p.serial_run ?? 0))}`})`
              : ''}
            .
            {baseRaw ? (
              <>
                {' '}
                Base asks <Price cents={baseRaw.price_cents} /> raw
                {basePsa10 ? (
                  <>
                    {' '}
                    and <Price cents={basePsa10.price_cents} /> in PSA 10
                  </>
                ) : null}
                .
              </>
            ) : null}
            {top && top.p.name !== 'Base' ? (
              <>
                {' '}
                Most valuable priced parallel: {formatParallel(
                  top.p.name,
                  top.p.serial_run,
                )} at <Price cents={top.max} />.
              </>
            ) : null}
          </p>
          <ImageCredit />
        </div>
      </header>

      <h2>{priced.length > 0 ? 'Value by parallel and grade' : 'Parallels and print runs'}</h2>
      {priced.length > 0 ? <PriceNote /> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Parallel</th>
              {priced.length > 0 ? (
                <>
                  <th className="num">{GRADE_LABELS.RAW}</th>
                  <th className="num">{GRADE_LABELS.PSA9}</th>
                  <th className="num">{GRADE_LABELS.PSA10}</th>
                  <th>Buy</th>
                </>
              ) : (
                <th className="num">Print run</th>
              )}
            </tr>
          </thead>
          <tbody>
            {card.parallels.map((p) => {
              const byGrade = new Map(p.prices.map((pr) => [pr.grade, pr]));
              const buy = p.prices.find((pr) => pr.buy_url)?.buy_url;
              const foil = foilProps(p.name, p.serial_run);
              return (
                <tr key={p.id}>
                  <td className="td-parallel">
                    {cardImage(card.public_slug, p.name) ? (
                      <CardVisual
                        publicSlug={card.public_slug}
                        name={`${name}, ${formatParallel(p.name, p.serial_run)}`}
                        number={card.number}
                        parallelName={p.name}
                        serialRun={p.serial_run}
                        size="thumb"
                      />
                    ) : (
                      <span
                        className={`foil-chip ${foil.className}`}
                        style={foil.style}
                        aria-hidden="true"
                      />
                    )}
                    {formatParallel(p.name, p.serial_run)}
                  </td>
                  {priced.length > 0 ? (
                    <>
                      <td className="num">
                        <Price cents={byGrade.get('RAW')?.price_cents} />
                      </td>
                      <td className="num">
                        <Price cents={byGrade.get('PSA9')?.price_cents} />
                      </td>
                      <td className="num">
                        <Price cents={byGrade.get('PSA10')?.price_cents} />
                      </td>
                      <td>
                        {buy ? (
                          <a
                            href={buy}
                            rel="sponsored nofollow noopener"
                            target="_blank"
                            data-attr="ebay-listing"
                          >
                            eBay listings
                          </a>
                        ) : (
                          <span className="muted">–</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="num mono">
                      {p.serial_run === null
                        ? 'Unnumbered'
                        : p.serial_run === 1
                          ? '1 of 1'
                          : `/${p.serial_run}`}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        {priced.length > 0 ? 'Buy links may be affiliate links. ' : ''}Photos you take in the app
        stay private.
      </p>

      <h2>Price history</h2>
      {history.length >= 2 ? (
        <PriceHistory points={history} />
      ) : (
        <EmptyState title="No price history yet.">
          The Base raw asking price is recorded each night it changes; the chart starts after the
          second point.
        </EmptyState>
      )}

      {related.length > 0 || neighbours.length > 0 ? (
        <>
          <h2>Related cards</h2>
          <ul className="related">
            {related.map((c) => (
              <li key={c.id}>
                <Link href={cardPath(c.public_slug)} className="related__item">
                  <CardVisual
                    publicSlug={c.public_slug}
                    name={`${c.set?.season} ${c.set?.name} ${card.player.name} ${c.is_rookie ? 'rookie card' : 'card'} #${c.number}`}
                    number={c.number}
                    isRookie={c.is_rookie}
                    size="thumb"
                  />
                  <span>
                    {card.player.name} #{c.number}
                    <span className="muted small">
                      {c.set?.season} {c.set?.name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {neighbours.map((c) => (
              <li key={c.id}>
                <Link href={cardPath(c.public_slug ?? c.slug)} className="related__item">
                  <CardVisual
                    publicSlug={c.public_slug ?? c.slug}
                    name={`${card.set.season} ${card.set.name} ${c.player?.name ?? ''} ${c.is_rookie ? 'rookie card' : 'card'} #${c.number}`}
                    number={c.number}
                    isRookie={c.is_rookie}
                    size="thumb"
                  />
                  <span>
                    {c.player?.name} #{c.number}
                    <span className="muted small">
                      {card.set.season} {card.set.name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <AppCta context={`your ${card.player.name} #${card.number}`} />
    </>
  );
}
