import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ListFilter } from '@/components/list-filter';
import { listPlayers } from '@/lib/data';
import { PATHS, playerPath } from '@/lib/paths';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'NBA Player Cards: values by set and parallel',
  description:
    'Every player with a 2025-26 Topps basketball card: rookie and base cards, parallels with print runs, asking prices by grade and the last box scores.',
  alternates: { canonical: PATHS.players },
};

const SUFFIXES = new Set(['jr.', 'jr', 'sr.', 'sr', 'ii', 'iii', 'iv']);

/** Last name for the directory order: "P.J. Washington Jr." files under W. */
function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1]!.toLowerCase())) parts.pop();
  return parts[parts.length - 1] ?? name;
}

export default async function PlayersPage() {
  const players = await listPlayers();
  const sorted = [...players].sort(
    (a, b) => lastName(a.name).localeCompare(lastName(b.name)) || a.name.localeCompare(b.name),
  );
  const groups = new Map<string, typeof sorted>();
  for (const p of sorted) {
    const letter = lastName(p.name).charAt(0).toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), p]);
  }
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Players', href: PATHS.players },
        ]}
      />
      <header className="dir__head">
        <h1>NBA player cards</h1>
        <p className="lead">
          {players.length} players with at least one 2025-26 Topps card, filed by last name. Each
          page lists every card, parallel and print run, with values once listings are priced, plus
          the last box scores.
        </p>
        <ListFilter
          target="players"
          label="Filter players"
          placeholder="Filter by player or team"
          total={players.length}
          noun="players"
        />
      </header>
      <div className="dir" id="players">
        {[...groups.entries()].map(([letter, list]) => (
          <section key={letter} className="dir__group" data-group aria-label={`Players ${letter}`}>
            <h2 className="dir__letter" aria-hidden="true">
              {letter}
            </h2>
            <ul className="dir__list">
              {list.map((p) => (
                <li key={p.id} data-filter={`${p.name} ${p.team ?? ''}`.toLowerCase()}>
                  <Link href={playerPath(p.public_slug ?? p.slug)}>{p.name}</Link>
                  <span className="dir__team">{p.team ?? 'Team to be announced'}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <AppCta context="your players" />
    </>
  );
}
