import Link from 'next/link';
import type { Metadata } from 'next';
import { formatParallel } from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { JsonLd } from '@/components/json-ld';
import { Delta, Price, PriceNote } from '@/components/price';
import { listSets, rookieRankings } from '@/lib/data';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${SITE_NAME} – ${SITE_TAGLINE}`,
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
          '@type': 'WebSite',
          name: SITE_NAME,
          url: absoluteUrl('/'),
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: absoluteUrl('/search?q={search_term_string}') },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      <h1>{SITE_TAGLINE}</h1>
      <p className="muted">{SITE_DESCRIPTION}</p>

      <form className="search-form" action="/search" method="get" role="search">
        <label htmlFor="q" className="muted small" style={{ flexBasis: '100%' }}>
          Search a player, a set or a card number
        </label>
        <input id="q" name="q" type="search" placeholder="Cooper Flagg, Topps Chrome, #3…" required />
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
