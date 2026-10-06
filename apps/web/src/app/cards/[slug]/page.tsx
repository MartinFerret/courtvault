import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatParallel, GRADE_LABELS } from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { Price, PriceNote } from '@/components/price';
import { getCard, listCardSlugs } from '@/lib/data';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const cards = await listCardSlugs();
  return cards.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card) return { title: 'Card not found' };
  const title = `${card.player.name} ${card.set.season} ${card.set.name} #${card.number}${card.is_rookie ? ' RC' : ''} value`;
  const parallels = card.parallels.map((p) => formatParallel(p.name, p.serial_run)).join(', ');
  const description = `${card.player.name} ${card.set.season} ${card.set.name} #${card.number}: median asking price by grade for ${parallels}.`;
  return {
    title,
    description: description.length > 158 ? `${description.slice(0, 155).replace(/,[^,]*$/, '')}…` : description,
    alternates: { canonical: `/cards/${card.slug}` },
    openGraph: { title, type: 'website' },
  };
}

export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card) notFound();
  const name = `${card.set.season} ${card.set.name} #${card.number} ${card.player.name}`;
  const allPrices = card.parallels.flatMap((p) => p.prices.map((pr) => pr.price_cents));
  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: `${card.player.name} basketball trading card, ${card.set.season} ${card.set.name}, card #${card.number}.`,
    url: absoluteUrl(`/cards/${card.slug}`),
    category: 'Sports Trading Card Singles',
    ...(allPrices.length > 0
      ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: (Math.min(...allPrices) / 100).toFixed(2),
            highPrice: (Math.max(...allPrices) / 100).toFixed(2),
            offerCount: card.parallels.reduce((n, p) => n + p.prices.reduce((m, pr) => m + pr.sample_size, 0), 0),
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
          { name: 'Sets', href: '/sets' },
          { name: `${card.set.season} ${card.set.name}`, href: `/sets/${card.set.slug}` },
          { name: `#${card.number} ${card.player.name}`, href: `/cards/${card.slug}` },
        ]}
      />
      <h1>
        #{card.number} {card.player.name} {card.is_rookie ? <span className="badge">RC</span> : null}
      </h1>
      <p className="muted">
        <Link href={`/sets/${card.set.slug}`}>
          {card.set.season} {card.set.name}
        </Link>{' '}
        · <Link href={`/players/${card.player.slug}`}>{card.player.name}</Link>
        {card.player.team ? ` · ${card.player.team}` : ''}
      </p>

      <h2>Value by parallel and grade</h2>
      <PriceNote />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Parallel</th>
              <th className="num">{GRADE_LABELS.RAW}</th>
              <th className="num">{GRADE_LABELS.PSA9}</th>
              <th className="num">{GRADE_LABELS.PSA10}</th>
              <th>Buy</th>
            </tr>
          </thead>
          <tbody>
            {card.parallels.map((p) => {
              const byGrade = new Map(p.prices.map((pr) => [pr.grade, pr]));
              const buy = p.prices.find((pr) => pr.buy_url)?.buy_url;
              return (
                <tr key={p.id}>
                  <td>{formatParallel(p.name, p.serial_run)}</td>
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
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Buy links may be affiliate links. No card images are shown: photos in the app are private and taken by
        their owners.
      </p>

      <AppCta context={`your ${card.player.name} #${card.number}`} deepLink={`/cards/${card.slug}`} />
    </>
  );
}
