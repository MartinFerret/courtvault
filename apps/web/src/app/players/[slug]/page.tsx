import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatEasternDay } from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { Price, PriceNote } from '@/components/price';
import { getPlayer, listPlayers } from '@/lib/data';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const players = await listPlayers();
    return players.map((p) => ({ slug: p.slug }));
  } catch (err) {
    // No database at build time: pages are generated on demand (dynamicParams = true).
    console.warn(`generateStaticParams skipped: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPlayer(slug);
  if (!player) return { title: 'Player not found' };
  const title = `${player.name} cards and values`;
  return {
    title,
    description: `${player.name}${player.team ? ` (${player.team})` : ''}: ${player.cards.length} cards with parallels and median asking prices by grade.`,
    alternates: { canonical: `/players/${player.slug}` },
    openGraph: { title, type: 'profile' },
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const player = await getPlayer(slug);
  if (!player) notFound();
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: player.name,
          url: absoluteUrl(`/players/${player.slug}`),
          ...(player.team ? { affiliation: { '@type': 'SportsTeam', name: player.team } } : {}),
        }}
      />
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Players', href: '/players' }, { name: player.name, href: `/players/${player.slug}` }]} />
      <h1>{player.name}</h1>
      <p className="muted">{player.team ?? 'Team to be announced'}</p>

      <h2>Cards</h2>
      <PriceNote />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Set</th>
              <th>#</th>
              <th className="num">Base, raw</th>
            </tr>
          </thead>
          <tbody>
            {player.cards.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/cards/${c.slug}`}>
                    {c.set?.season} {c.set?.name}
                  </Link>{' '}
                  {c.is_rookie ? <span className="badge">RC</span> : null}
                </td>
                <td className="mono">{c.number}</td>
                <td className="num">
                  <Price cents={c.base_cents} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {player.lines.length > 0 ? (
        <>
          <h2>Recent games</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Game</th>
                  <th className="num">MIN</th>
                  <th className="num">PTS</th>
                  <th className="num">REB</th>
                  <th className="num">AST</th>
                  <th className="num">STL</th>
                  <th className="num">BLK</th>
                </tr>
              </thead>
              <tbody>
                {player.lines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.game ? formatEasternDay(l.game.game_day) : '—'}</td>
                    <td>
                      {l.game ? `${l.game.away_team} @ ${l.game.home_team}` : '—'}
                      {l.game?.home_score !== null && l.game?.away_score !== null ? (
                        <span className="muted small"> {l.game?.away_score}–{l.game?.home_score}</span>
                      ) : null}
                    </td>
                    <td className="num">{l.minutes ?? '—'}</td>
                    <td className="num">{l.points ?? '—'}</td>
                    <td className="num">{l.rebounds ?? '—'}</td>
                    <td className="num">{l.assists ?? '—'}</td>
                    <td className="num">{l.steals ?? '—'}</td>
                    <td className="num">{l.blocks ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Game statistics are factual information.</p>
        </>
      ) : null}

      <AppCta context={`your ${player.name} cards`} deepLink={`/players/${player.slug}`} />
    </>
  );
}
