import Link from 'next/link';
import { formatCents, formatEasternDay, PRICE_LABEL } from '@courtvault/shared';
import { AppCta } from './app-cta';
import { JsonLd } from './json-ld';
import { FreshnessLine } from './freshness';
import { EmptyState } from './empty-state';
import { NightPager } from './night-pager';
import { GameCards, MoverBars, PerformanceBars, PointsVsValue } from './night-charts';
import type { Freshness } from '@/lib/freshness';
import { absoluteUrl } from '@/lib/site';
import type { LastNight } from '@/lib/last-night';
import { PATHS, moversPath } from '@/lib/paths';

export function lastNightTitle(day: string): string {
  // Keyword of the page (docs/keyword-map.csv): trending basketball cards.
  return `Trending Basketball Cards: after ${formatEasternDay(day)}`;
}

export interface SlugMaps {
  cards: Map<string, string>;
  players: Map<string, string>;
}

export function LastNightView({
  data,
  day,
  slugs,
  freshness = null,
  days = [],
}: {
  data: LastNight;
  day: string;
  slugs: SlugMaps;
  freshness?: Freshness | null;
  days?: { game_day: string }[];
}) {
  const finals = data.games.filter((g) => g.home_score !== null && g.away_score !== null);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: lastNightTitle(day),
    datePublished: `${day}T13:00:00Z`,
    dateModified: data.after_at,
    url: absoluteUrl(moversPath(day)),
    description: `How basketball card asking prices moved after the ${data.games.length} games of ${formatEasternDay(day)}: biggest gainers, biggest losers, performances of the night.`,
    about: data.performances.slice(0, 5).map((p) => ({ '@type': 'Person', name: p.player_name })),
  };
  return (
    <article className="ln">
      <JsonLd data={jsonLd} />

      <header className="ln__hero">
        <p className="ln__eyebrow">
          <Link href={PATHS.movers}>Last night</Link>, {formatEasternDay(day)}
          {data.is_preseason ? <span className="tag">Preseason</span> : null}
          {data.is_off_day && !data.requested_day ? (
            <span className="muted"> (no games last night, latest game night shown)</span>
          ) : null}
        </p>
        <h1 className="ln__title">Trending basketball cards after {formatEasternDay(day)}</h1>
        <FreshnessLine data={freshness} />
        <dl className="facts facts--night">
          <div>
            <dd>{finals.length}</dd>
            <dt>games</dt>
          </div>
          <div>
            <dd>{data.performances.length}</dd>
            <dt>top lines tracked</dt>
          </div>
          {freshness?.priced_cards ? (
            <>
              <div>
                <dd>{data.gainers.length}</dd>
                <dt>cards up</dt>
              </div>
              <div>
                <dd>{data.losers.length}</dd>
                <dt>cards down</dt>
              </div>
            </>
          ) : null}
        </dl>
      </header>

      <section className="ln__section">
        <h2 className="ln__h2">The games</h2>
        <GameCards data={data} slugs={slugs} />
      </section>

      <section className="ln__section">
        <div className="section__head">
          <h2 className="ln__h2">Who showed up</h2>
          <span className="muted small">
            Points scored, and what the reference card asks this morning
          </span>
        </div>
        <PerformanceBars data={data} slugs={slugs} />
      </section>

      {freshness?.priced_cards ? (
        <section className="ln__section">
          <h2 className="ln__h2">Points against card value, same night</h2>
          <PointsVsValue data={data} slugs={slugs} />
          {data.performances.every((p) => p.top_cards.length === 0) ? (
            <EmptyState title="No priced card among the players who played." />
          ) : null}
        </section>
      ) : null}

      <section className="ln__section">
        <div className="section__head">
          <h2 className="ln__h2">What moved since tip-off</h2>
          <span className="muted small">Asking prices before the games and this morning</span>
        </div>
        {data.gainers.length + data.losers.length > 0 ? (
          <MoverBars gainers={data.gainers} losers={data.losers} slugs={slugs} />
        ) : (
          <EmptyState
            title={
              freshness?.priced_cards
                ? 'Nothing moved enough to list.'
                : 'Movers start with the regular season.'
            }
          >
            {freshness?.priced_cards
              ? `A mover needs ${data.thresholds.min_sample_size} listings and a change since tip-off.`
              : 'Box scores are in; asking prices are compared before tip-off and the next morning once cards are priced.'}
          </EmptyState>
        )}
      </section>

      <NightPager days={days} current={day} />

      <AppCta context="what last night did to YOUR collection" />

      <p className="ln__footnote">
        {PRICE_LABEL} compared before tip-off and after the next morning&apos;s update, for cards of
        players who played, with at least {data.thresholds.min_sample_size} listings and a price
        above {formatCents(data.thresholds.min_price_cents)}. This page reports what moved, not why.{' '}
        <Link href={PATHS.method}>How we price cards</Link>
      </p>
    </article>
  );
}
