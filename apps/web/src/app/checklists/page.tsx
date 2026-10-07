import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { listSets } from '@/lib/data';
import { checklistPath, PATHS } from '@/lib/paths';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Basketball Card Checklists: every Topps set, cards and values',
  description:
    'Every 2025-26 Topps basketball checklist in the catalog: base cards, rookie cards, parallels with print runs and median asking prices by grade.',
  alternates: { canonical: PATHS.checklists },
};

export default async function SetsPage() {
  const sets = await listSets();
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Checklists', href: PATHS.checklists },
        ]}
      />
      <h1>Basketball card checklists</h1>
      <div className="grid">
        {sets.map((s) => (
          <Link key={s.id} href={checklistPath(s.public_slug)} className="card">
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
