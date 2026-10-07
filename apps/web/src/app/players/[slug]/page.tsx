import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { formatEasternDay } from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { FormBadge } from '@/components/form-badge';
import { FormPriceChart } from '@/components/form-price-chart';
import { JsonLd } from '@/components/json-ld';
import { Price, PriceNote } from '@/components/price';
import { getPlayer, indexStatus, listPlayers, playerAliasTarget } from '@/lib/data';
import { PATHS, cardPath, checklistPath, playerPath } from '@/lib/paths';
import { getPlayerForm } from '@/lib/player-form';
import { absoluteUrl, robotsFor, seoTitle } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const players = await listPlayers();
    return players.map((p) => ({ slug: p.public_slug ?? p.slug }));
  } catch (err) {
    console.warn(`generateStaticParams skipped: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/** "<name> rookie cards" for a player with a rookie card in scope, "<name> cards" otherwise. */
function keyword(player: { name: string; cards: { is_rookie: boolean }[] }): string {
  return `${player.name} ${player.cards.some((c) => c.is_rookie) ? 'Rookie Cards' : 'Cards'}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPlayer(slug);
  if (!player) return { title: 'Player not found' };
  const status = await indexStatus('player', player.public_slug ?? player.slug);
  const sets = new Set(player.cards.map((c) => `${c.set?.season} ${c.set?.name}`));
  return {
    ...robotsFor(status.indexable),
    title: seoTitle(keyword(player), 'values by set and grade'),
    description: `${player.name}${player.team ? ` (${player.team})` : ''}: ${player.cards.length} card${player.cards.length > 1 ? 's' : ''} in ${sets.size} Topps set${sets.size > 1 ? 's' : ''}, every parallel with median asking prices by grade, plus recent box scores.`,
    alternates: { canonical: playerPath(player.public_slug ?? player.slug) },
    openGraph: { title: keyword(player), type: 'profile' },
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const player = await getPlayer(slug);
  if (!player) {
    // Merged duplicate ("cade-cunnigham-cards"): the old URL goes to the canonical player.
    const target = await playerAliasTarget(slug);
    if (target) permanentRedirect(playerPath(target));
    notFound();
  }
  const publicSlug = player.public_slug ?? player.slug;
  if (publicSlug !== slug) permanentRedirect(playerPath(publicSlug));
  const form = await getPlayerForm(player.id).catch(() => null);
  const chartable = form && form.games.length >= 3;
  const rookie = player.cards.some((c) => c.is_rookie);
  const priced = player.cards.filter((c) => c.base_cents !== null);
  const top = [...priced].sort((a, b) => (b.base_cents ?? 0) - (a.base_cents ?? 0))[0];
  const sets = [...new Set(player.cards.map((c) => `${c.set?.season} ${c.set?.name}`))];
  const last = player.lines[0];
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: player.name,
          url: absoluteUrl(playerPath(publicSlug)),
          ...(player.team ? { affiliation: { '@type': 'SportsTeam', name: player.team } } : {}),
        }}
      />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Players', href: PATHS.players },
          { name: player.name, href: playerPath(publicSlug) },
        ]}
      />
      <h1>
        {player.name} {rookie ? 'rookie cards' : 'cards'} <FormBadge badge={form?.badge} />
      </h1>
      <p className="lead">
        {player.name}
        {player.team ? ` (${player.team})` : ''} has {player.cards.length} {rookie ? 'rookie ' : ''}
        card
        {player.cards.length > 1 ? 's' : ''} in {sets.join(' and ')}.
        {top && top.base_cents !== null ? (
          <>
            {' '}
            The highest median asking price, Base parallel raw, is <Price
              cents={top.base_cents}
            />{' '}
            for #{top.number} {top.set?.season} {top.set?.name}.
          </>
        ) : null}
        {last?.game ? (
          <>
            {' '}
            Last game, {formatEasternDay(last.game.game_day)}: {last.points ?? 0} points,{' '}
            {last.rebounds ?? 0} rebounds, {last.assists ?? 0} assists.
          </>
        ) : null}
      </p>

      {form && form.season.games > 0 ? (
        <dl className="facts facts--lime">
          <div>
            <dd>{form.season.games}</dd>
            <dt>games this season</dt>
          </div>
          <div>
            <dd>{form.season.pra_avg ?? '–'}</dd>
            <dt>pts + reb + ast per game</dt>
          </div>
          {form.last5.games === 5 ? (
            <div>
              <dd>{form.last5.pra_avg ?? '–'}</dd>
              <dt>last 5 games</dt>
            </div>
          ) : null}
          {form.price ? (
            <div>
              <dd>
                <Price cents={form.price.current_cents} />
              </dd>
              <dt>
                {form.price.set_name} #{form.price.card_number}, Base raw
              </dt>
            </div>
          ) : null}
        </dl>
      ) : null}

      {chartable && form ? (
        <section className="fp">
          <div className="section__head">
            <h2>Form and price, same dates</h2>
          </div>
          <FormPriceChart form={form} />
          <p className="muted small">
            {form.price ? (
              <>
                Points per game, and the median asking price of {form.price.season}{' '}
                {form.price.set_name} #{form.price.card_number} Base raw the morning after each
                game. Two facts on the same dates; a game can move a card, we never claim it did.
              </>
            ) : (
              'Points per game. The value track appears once one of his cards has price history.'
            )}
          </p>
        </section>
      ) : null}

      <h2>{priced.length > 0 ? 'Cards and values' : 'Cards'}</h2>
      {priced.length > 0 ? <PriceNote /> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Set</th>
              <th>#</th>
              {priced.length > 0 ? <th className="num">Base, raw</th> : null}
            </tr>
          </thead>
          <tbody>
            {player.cards.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={cardPath(c.public_slug)}>
                    {c.set?.season} {c.set?.name}
                  </Link>{' '}
                  {c.is_rookie ? <span className="badge">RC</span> : null}{' '}
                  {c.set ? (
                    <Link href={checklistPath(c.set.public_slug)} className="muted small">
                      checklist
                    </Link>
                  ) : null}
                </td>
                <td className="mono">{c.number}</td>
                {priced.length > 0 ? (
                  <td className="num">
                    <Price cents={c.base_cents} />
                  </td>
                ) : null}
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
                    <td>{l.game ? formatEasternDay(l.game.game_day) : '–'}</td>
                    <td>
                      {l.game
                        ? `${l.game.away_team} at ${l.game.home_team}, ${l.game.away_score ?? '-'}–${l.game.home_score ?? '-'}`
                        : '–'}
                    </td>
                    <td className="num">{l.minutes ?? '–'}</td>
                    <td className="num">{l.points ?? '–'}</td>
                    <td className="num">{l.rebounds ?? '–'}</td>
                    <td className="num">{l.assists ?? '–'}</td>
                    <td className="num">{l.steals ?? '–'}</td>
                    <td className="num">{l.blocks ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <AppCta context={`your ${player.name} cards`} />
    </>
  );
}
