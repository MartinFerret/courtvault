import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Price, PriceNote } from '@/components/price';
import { getSet, listSets } from '@/lib/data';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const sets = await listSets();
  return sets.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const set = await getSet(slug);
  if (!set) return { title: 'Set not found' };
  const title = `${set.season} ${set.name} checklist and values`;
  return {
    title,
    description: `${set.season} ${set.name}: ${set.cards.length} cards with parallels and median asking prices by grade.`,
    alternates: { canonical: `/sets/${set.slug}` },
    openGraph: { title, type: 'website' },
  };
}

export default async function SetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const set = await getSet(slug);
  if (!set) notFound();
  const title = `${set.season} ${set.name}`;
  return (
    <>
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Sets', href: '/sets' }, { name: title, href: `/sets/${set.slug}` }]} />
      <h1>{title}</h1>
      <p className="muted">
        {set.cards.length} cards{set.release_date ? ` · released ${set.release_date}` : ''}. Set name shown for
        identification only.
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
                  <Link href={`/cards/${c.slug}`}>{c.player?.name ?? '—'}</Link>{' '}
                  {c.is_rookie ? <span className="badge">RC</span> : null}
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
      <AppCta context={`your ${title} checklist`} deepLink={`/sets/${set.slug}`} />
    </>
  );
}
