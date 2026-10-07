import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { listSets } from '@/lib/data';
import { checklistPath, PATHS } from '@/lib/paths';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Basketball Card Checklists: every Topps set',
  description:
    'Every 2025-26 Topps basketball checklist: base cards, rookie cards, parallels with print runs and median asking prices by grade, from the official lists.',
  alternates: { canonical: PATHS.checklists },
};

export default async function SetsPage() {
  const sets = await listSets();
  const latest = sets.reduce(
    (best, s, i) =>
      s.release_date && (best < 0 || s.release_date > (sets[best]?.release_date ?? '')) ? i : best,
    -1,
  );
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Checklists', href: PATHS.checklists },
        ]}
      />
      <h1>Basketball card checklists</h1>
      <p className="lead">
        {sets.length} Topps sets,{' '}
        {sets.reduce((n, s) => n + s.card_count, 0).toLocaleString('en-US')} base cards, straight
        from the official checklists. Open a set for every card, its parallels and print runs.
      </p>
      <div className="shelf">
        {sets.map((s, i) => (
          <Link
            key={s.id}
            href={checklistPath(s.public_slug)}
            className={`shelf__tile${i === latest ? ' shelf__tile--latest' : ''}`}
          >
            <span className="shelf__count">{s.card_count}</span>
            <span className="shelf__name">{s.name}</span>
            <span className="shelf__meta">
              {s.season}
              {s.release_date ? `, released ${s.release_date}` : ''}
              {i === latest ? ', newest set' : ''}
            </span>
          </Link>
        ))}
      </div>
      <AppCta context="your sets" />
    </>
  );
}
