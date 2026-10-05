import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { listSets } from '@/lib/data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Sets',
  description: 'Every basketball card set in the catalog, by season, with checklists and values.',
  alternates: { canonical: '/sets' },
};

export default async function SetsPage() {
  const sets = await listSets();
  return (
    <>
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Sets', href: '/sets' }]} />
      <h1>Sets</h1>
      <div className="grid">
        {sets.map((s) => (
          <Link key={s.id} href={`/sets/${s.slug}`} className="card">
            <strong>
              {s.season} {s.name}
            </strong>
            <br />
            <span className="muted small">
              {s.card_count} cards{s.release_date ? ` · ${s.release_date}` : ''}
            </span>
          </Link>
        ))}
      </div>
      <AppCta context="your sets" deepLink="/sets" />
    </>
  );
}
