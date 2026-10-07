import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ListFilter } from '@/components/list-filter';
import { listPlayers } from '@/lib/data';
import { PATHS, playerPath } from '@/lib/paths';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'NBA Players and Their Cards: values by set and parallel',
  description:
    'Every player with a 2025-26 Topps basketball card: rookie cards and base cards, parallels with print runs, median asking prices by grade, recent box scores.',
  alternates: { canonical: PATHS.players },
};

export default async function PlayersPage() {
  const players = await listPlayers();
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Players', href: PATHS.players },
        ]}
      />
      <h1>NBA players and their cards</h1>
      <ListFilter
        target="players"
        label="Filter players"
        placeholder="Filter by player or team"
        total={players.length}
        noun="players"
      />
      <div className="grid" id="players">
        {players.map((p) => (
          <Link
            key={p.id}
            href={playerPath(p.public_slug ?? p.slug)}
            className="card"
            data-filter={`${p.name} ${p.team ?? ''}`.toLowerCase()}
          >
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
