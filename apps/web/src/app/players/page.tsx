import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { listPlayers } from '@/lib/data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Players',
  description: 'Basketball players in the catalog with their cards and values.',
  alternates: { canonical: '/players' },
};

export default async function PlayersPage() {
  const players = await listPlayers();
  return (
    <>
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Players', href: '/players' }]} />
      <h1>Players</h1>
      <div className="grid">
        {players.map((p) => (
          <Link key={p.id} href={`/players/${p.slug}`} className="card">
            <strong>{p.name}</strong>
            <br />
            <span className="muted small">{p.team ?? 'Team to be announced'}</span>
          </Link>
        ))}
      </div>
      <AppCta context="your players" />
    </>
  );
}
