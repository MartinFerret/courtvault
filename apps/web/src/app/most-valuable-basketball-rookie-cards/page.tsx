import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { Delta, Price, PriceNote } from '@/components/price';
import { cardPublicSlugMap, rookieRankings } from '@/lib/data';
import { PATHS, cardPath, checklistPath } from '@/lib/paths';
import { absoluteUrl, seoTitle } from '@/lib/site';
import { checklistPublicSlug } from '@courtvault/shared';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: seoTitle('Most Valuable Basketball Rookie Cards', 'ranked by asking price'),
  description:
    '2025-26 Topps basketball rookie cards ranked by median asking price, Base parallel raw, with the 7-day change. Refreshed every night from live listings.',
  alternates: { canonical: PATHS.rookies },
};

export default async function RookieRankingsPage() {
  const [rookies, slugs] = await Promise.all([rookieRankings(50), cardPublicSlugMap()]);
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
            url: absoluteUrl(cardPath(slugs.get(r.card_slug) ?? r.card_slug)),
          })),
        }}
      />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Most valuable rookie cards', href: PATHS.rookies },
        ]}
      />
      <h1>Most valuable basketball rookie cards</h1>
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
                  <Link href={cardPath(slugs.get(r.card_slug) ?? r.card_slug)}>
                    #{r.card_number} {r.player_name}
                  </Link>
                </td>
                <td>
                  <Link href={checklistPath(checklistPublicSlug(r.set_slug))}>
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
