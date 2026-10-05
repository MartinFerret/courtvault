import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { Delta, Price, PriceNote } from '@/components/price';
import { rookieRankings } from '@/lib/data';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Most valuable rookie cards',
  description: 'Rookie basketball cards ranked by median asking price (base parallel, raw), updated daily.',
  alternates: { canonical: '/rankings/rookies' },
};

export default async function RookieRankingsPage() {
  const rookies = await rookieRankings(50);
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Most valuable rookie cards',
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          numberOfItems: rookies.length,
          itemListElement: rookies.map((r, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `${r.season} ${r.set_name} #${r.card_number} ${r.player_name}`,
            url: absoluteUrl(`/cards/${r.card_slug}`),
          })),
        }}
      />
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Rookie rankings', href: '/rankings/rookies' }]} />
      <h1>Most valuable rookie cards</h1>
      <PriceNote />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Card</th>
              <th>Set</th>
              <th className="num">Base, raw</th>
              <th className="num">7 days</th>
            </tr>
          </thead>
          <tbody>
            {rookies.map((r, i) => (
              <tr key={r.card_id}>
                <td className="num muted">{i + 1}</td>
                <td>
                  <Link href={`/cards/${r.card_slug}`}>
                    #{r.card_number} {r.player_name}
                  </Link>
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
      <AppCta context="your rookies" deepLink="/rankings/rookies" />
    </>
  );
}
