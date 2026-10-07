import Link from 'next/link';
import type { Metadata } from 'next';
import { BRAND_TAGLINE, PRICING, formatParallel, formatUsd } from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { JsonLd } from '@/components/json-ld';
import { Delta, Price, PriceNote } from '@/components/price';
import { listSets, rookieRankings } from '@/lib/data';
import {
  HOME_KEYWORD,
  HOME_PROMISE,
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  seoTitle,
} from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  // R24/R27: the commercial keyword lives here only. The root page shares the layout's segment,
  // so the layout's title template does not apply to it: the suffix is explicit here.
  title: { absolute: `${seoTitle(HOME_KEYWORD, HOME_PROMISE)} | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [rookies, sets] = await Promise.all([rookieRankings(10), listSets()]);
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': absoluteUrl('/#organization'),
              name: SITE_NAME,
              url: absoluteUrl('/'),
            },
            {
              '@type': 'WebSite',
              name: SITE_NAME,
              url: absoluteUrl('/'),
              publisher: { '@id': absoluteUrl('/#organization') },
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: absoluteUrl('/search?q={search_term_string}'),
                },
                'query-input': 'required name=search_term_string',
              },
            },
            // R86: product markup on the product page only. Prices from the single source of truth (R69, R85).
            {
              '@type': 'SoftwareApplication',
              name: SITE_NAME,
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'iOS, Android, Web',
              description: SITE_DESCRIPTION,
              url: absoluteUrl('/'),
              offers: [
                { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: PRICING.currency },
                {
                  '@type': 'Offer',
                  name: 'Premium monthly',
                  price: PRICING.monthlyUsd.toFixed(2),
                  priceCurrency: PRICING.currency,
                },
                {
                  '@type': 'Offer',
                  name: 'Premium yearly',
                  price: PRICING.yearlyUsd.toFixed(2),
                  priceCurrency: PRICING.currency,
                },
              ],
            },
          ],
        }}
      />
      <h1>{HOME_KEYWORD}</h1>
      <p className="muted">
        {BRAND_TAGLINE} {SITE_DESCRIPTION}
      </p>
      <p className="muted small">
        Free, with Premium at {formatUsd(PRICING.monthlyUsd)}/month or{' '}
        {formatUsd(PRICING.yearlyUsd)}/year.
      </p>

      <form className="search-form" action="/search" method="get" role="search">
        <label htmlFor="q" className="muted small" style={{ flexBasis: '100%' }}>
          Search a player, a set or a card number
        </label>
        <input
          id="q"
          name="q"
          type="search"
          placeholder="Cooper Flagg, Topps Chrome, #3…"
          required
        />
        <button className="button" type="submit">
          Search
        </button>
      </form>

      <h2>Trending rookies</h2>
      <PriceNote />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Set</th>
              <th className="num">Base, raw</th>
              <th className="num">7 days</th>
            </tr>
          </thead>
          <tbody>
            {rookies.map((r) => (
              <tr key={r.card_id}>
                <td>
                  <Link href={`/cards/${r.card_slug}`}>
                    #{r.card_number} {r.player_name}
                  </Link>{' '}
                  <span className="badge">RC</span>
                </td>
                <td>
                  <Link href={`/sets/${r.set_slug}`}>
                    {r.season} {r.set_name}
                  </Link>
                </td>
                <td className="num">
                  <Price cents={r.price_cents} />
                </td>
                <td className="num">
                  <Delta cents={r.change_7d_cents} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <Link href="/rankings/rookies">Full rookie rankings →</Link>
      </p>

      <h2>Sets</h2>
      <div className="grid">
        {sets.map((s) => (
          <Link key={s.id} href={`/sets/${s.slug}`} className="card">
            <strong>
              {s.season} {s.name}
            </strong>
            <br />
            <span className="muted small">
              {s.card_count} cards{s.release_date ? ` · released ${s.release_date}` : ''}
            </span>
          </Link>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        Example: {formatParallel('Gold Refractor', 50)} means numbered to 50 copies.
      </p>

      <AppCta />
    </>
  );
}
