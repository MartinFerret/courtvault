import Link from 'next/link';
import { formatEasternDay } from '@courtvault/shared';
import type { Freshness } from '@/lib/freshness';
import type { LastNight, MoversWindow } from '@/lib/last-night';
import { PATHS, moversPath } from '@/lib/paths';
import { EmptyState } from './empty-state';
import { FreshnessLine } from './freshness';
import type { SlugMaps } from './last-night-page';
import { MoverBars, PerformanceBars } from './night-charts';

/**
 * The main trending page: its own content, distinct from the dated boards (audit 4.5).
 * Latest night in short, movers over the last seven nights, the archive of past nights.
 */
export function TrendingHub({
  latest,
  window,
  freshness,
  slugs,
}: {
  latest: LastNight | null;
  window: MoversWindow | null;
  freshness: Freshness | null;
  slugs: SlugMaps;
}) {
  const day = latest?.day ?? null;
  const topLine = latest
    ? [...latest.performances].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0]
    : null;
  const gainers = window?.gainers.map((m) => ({ ...m, line: null })) ?? [];
  const losers = window?.losers.map((m) => ({ ...m, line: null })) ?? [];
  return (
    <>
      <header className="board">
        <div className="board__top">
          <p className="ln__eyebrow board__eyebrow">Updated every morning after the games</p>
          <h1 className="ln__title board__title">Trending basketball cards</h1>
          <p className="board__headline">
            {day && topLine
              ? `Last night, ${formatEasternDay(day)}: ${topLine.player_name} ${topLine.points ?? 0} points${
                  latest && latest.gainers.length > 0
                    ? `, ${latest.gainers[0]!.player_name} #${latest.gainers[0]!.card_number} up ${latest.gainers[0]!.change_pct.toFixed(1)}% since tip-off.`
                    : '.'
                }`
              : 'Box scores and asking prices, side by side, after each NBA night.'}
          </p>
          <FreshnessLine data={freshness} className="board__fresh" />
        </div>
        <dl className="board__facts">
          {window ? (
            <div>
              <dd>{window.nights.length}</dd>
              <dt>nights in the last {window.days} days</dt>
            </div>
          ) : null}
          {latest ? (
            <div>
              <dd>{latest.games.length}</dd>
              <dt>games last night</dt>
            </div>
          ) : null}
          {freshness?.priced_cards ? (
            <div>
              <dd>{freshness.priced_cards}</dd>
              <dt>cards with a value</dt>
            </div>
          ) : null}
        </dl>
      </header>

      {latest && day ? (
        <section className="ln__section">
          <div className="section__head">
            <h2 className="ln__h2">Last night in short</h2>
            <Link href={moversPath(day)}>Full board for {formatEasternDay(day)}</Link>
          </div>
          <div className="chart">
            <PerformanceBars data={latest} slugs={slugs} limit={3} />
          </div>
        </section>
      ) : (
        <EmptyState title="No game night recorded yet.">
          The first board appears the morning after the first games.
        </EmptyState>
      )}

      <section className="ln__section">
        <div className="section__head">
          <h2 className="ln__h2">Movers over the last {window?.days ?? 7} nights</h2>
          <span className="muted small">
            Asking price today against {window?.days ?? 7} days ago
          </span>
        </div>
        {gainers.length + losers.length > 0 ? (
          <MoverBars gainers={gainers} losers={losers} slugs={slugs} />
        ) : (
          <EmptyState
            title={
              freshness?.priced_cards
                ? 'Nothing moved enough over the window.'
                : 'Movers start with the regular season.'
            }
          >
            {freshness?.priced_cards
              ? 'A mover needs enough listings and a different price than a week ago.'
              : 'Asking prices are compared night after night once cards are priced; box scores are already in.'}
          </EmptyState>
        )}
      </section>

      {window && window.nights.length > 0 ? (
        <section className="ln__section">
          <h2 className="ln__h2">Past nights</h2>
          <ul className="nights">
            {window.nights.map((n) => (
              <li key={n.game_day}>
                <Link href={moversPath(n.game_day)}>{formatEasternDay(n.game_day)}</Link>
                <span className="muted small">
                  {n.games} game{n.games > 1 ? 's' : ''}, {n.lines} lines
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="muted small">
        What a value means and how the nightly update runs:{' '}
        <Link href={PATHS.method}>How we price cards</Link>.
      </p>
    </>
  );
}
