import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { GRADE_LABELS, formatParallel } from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { foilProps } from '@/components/foil';
import { JsonLd } from '@/components/json-ld';
import { Price, PriceNote } from '@/components/price';
import { getCard, indexStatus, listCardSlugs } from '@/lib/data';
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
  const name = `${card.set.season} ${card.set.name} #${card.number} ${card.player.name}`;
  const allPrices = card.parallels.flatMap((p) => p.prices.map((pr) => pr.price_cents));
  const priced = card.parallels.filter((p) => p.prices.length > 0);
  const numbered = card.parallels.filter((p) => p.serial_run !== null);
  const top = priced
    .map((p) => ({ p, max: Math.max(...p.prices.map((pr) => pr.price_cents)) }))
    .sort((a, b) => b.max - a.max)[0];
  const base = card.parallels.find((p) => p.name === 'Base');
  const rarestParallel = [...card.parallels].sort(
    (a, b) => (a.serial_run ?? Number.MAX_SAFE_INTEGER) - (b.serial_run ?? Number.MAX_SAFE_INTEGER),
  )[0];
  const rarest = foilProps(rarestParallel?.name ?? 'Base', rarestParallel?.serial_run ?? null);
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
      <header className={`plaque ${rarest.className}`} style={rarest.style}>
        <span className="plaque__number">#{card.number}</span>
        <h1 className="plaque__title">
          {card.set.season} {card.set.name} {card.player.name}{' '}
          {card.is_rookie ? 'rookie card' : 'card'} #{card.number}
        </h1>
        <p className="plaque__links">
          <Link href={checklistPath(card.set.public_slug)}>
            {card.set.season} {card.set.name} checklist
          </Link>
          <Link href={playerPath(card.player.public_slug)}>
            {card.player.name} {card.is_rookie ? 'rookie cards' : 'cards'}
          </Link>
          {card.player.team ? <span className="muted">{card.player.team}</span> : null}
        </p>
        <ul className="ladder" aria-label="Parallels of this card">
          {card.parallels.map((p) => {
            const foil = foilProps(p.name, p.serial_run);
            return (
              <li key={p.id} className={`ladder__chip ${foil.className}`} style={foil.style}>
                {formatParallel(p.name, p.serial_run)}
              </li>
            );
          })}
        </ul>
      </header>
      <p className="lead">
        {card.player.name}&apos;s {card.set.season} {card.set.name}{' '}
        {card.is_rookie ? 'rookie card' : 'card'} #{card.number} has {card.parallels.length}{' '}
        parallels, {numbered.length} of them numbered
        {numbered.length > 0
          ? ` (from /${Math.max(...numbered.map((p) => p.serial_run ?? 0))} down to ${numbered.some((p) => p.serial_run === 1) ? '1 of 1' : `/${Math.min(...numbered.map((p) => p.serial_run ?? 0))}`})`
          : ''}
        .
        {baseRaw ? (
          <>
            {' '}
            The Base parallel asks <Price cents={baseRaw.price_cents} /> raw
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
            The most valuable priced parallel is {formatParallel(
              top.p.name,
              top.p.serial_run,
            )} at <Price cents={top.max} />.
          </>
        ) : null}
        {priced.length === 0 ? ' Values appear once listings have been priced.' : ''}
      </p>

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
                  <td>
                    <span
                      className={`foil-chip ${foil.className}`}
                      style={foil.style}
                      aria-hidden="true"
                    />
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
                          <a href={buy} rel="sponsored nofollow noopener" target="_blank">
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
        {priced.length > 0 ? 'Buy links may be affiliate links. ' : ''}No card images are shown:
        photos in the app are private and taken by their owners.
      </p>

      <AppCta context={`your ${card.player.name} #${card.number}`} />
    </>
  );
}
