import Link from 'next/link';
import { formatCents, formatCentsDelta, formatEasternDay, formatPercent, PRICE_LABEL } from '@courtvault/shared';
import { AppCta } from './app-cta';
import { Breadcrumbs } from './breadcrumbs';
import { FoilCard } from './foil-card';
import { JsonLd } from './json-ld';
import { absoluteUrl } from '@/lib/site';
import type { LastNight, Mover } from '@/lib/last-night';

export function lastNightTitle(day: string): string {
  return `Last night in the card market: ${formatEasternDay(day)}`;
}

function statLine(l: { points: number | null; rebounds: number | null; assists: number | null; steals: number | null; blocks: number | null; minutes: number | null }): string {
  return `${l.points ?? 0} pts · ${l.rebounds ?? 0} reb · ${l.assists ?? 0} ast · ${l.steals ?? 0} stl · ${l.blocks ?? 0} blk · ${l.minutes ?? 0} min`;
}

function MoverRow({ m, day }: { m: Mover; day: string }) {
  const cls = m.change_cents > 0 ? 'gain' : 'loss';
  return (
    <li className="mover">
      <FoilCard
        href={`/cards/${m.card_slug}`}
        number={m.card_number}
        player={m.player_name}
        setLabel={`${m.season} ${m.set_name}`}
        parallelName={m.parallel_name}
        serialRun={m.serial_run}
        grade={m.grade}
        isRookie={m.is_rookie}
        footer={
          <>
            <span className={`mono ${cls}`}>{formatPercent(m.change_pct)}</span>{' '}
            <span className="muted">
              {formatCents(m.before_cents)} → {formatCents(m.after_cents)}
            </span>
          </>
        }
      />
      <p className="mover__line small">
        {m.line ? (
          <>
            <Link href={`/last-night/${day}#${m.player_slug}`}>{m.player_name}</Link>: {statLine(m.line)}
            <span className="muted">
              {' '}
              ({m.line.away_team} {m.line.away_score}–{m.line.home_score} {m.line.home_team})
            </span>
          </>
        ) : null}
        <span className="muted"> · {m.sample_size} listings</span>
      </p>
    </li>
  );
}

export function LastNightView({ data, day }: { data: LastNight; day: string }) {
  const finals = data.games.filter((g) => g.home_score !== null && g.away_score !== null);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: lastNightTitle(day),
    datePublished: `${day}T13:00:00Z`,
    dateModified: data.after_at,
    url: absoluteUrl(`/last-night/${day}`),
    description: `How basketball card asking prices moved after the ${data.games.length} games of ${formatEasternDay(day)}: biggest gainers, biggest losers, performances of the night.`,
    about: data.performances.slice(0, 5).map((p) => ({ '@type': 'Person', name: p.player_name })),
  };
  return (
    <>
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Last night', href: '/last-night' }, { name: formatEasternDay(day), href: `/last-night/${day}` }]} />
      <h1>{lastNightTitle(day)}</h1>
      <p className="muted">
        {data.games.length} game{data.games.length > 1 ? 's' : ''}. Card asking prices compared before tip-off and after the
        next morning&apos;s update. {PRICE_LABEL} from active eBay listings, not sold prices. Prices move for many reasons: this page
        reports what moved, not why.
      </p>
      {data.is_off_day && !data.requested_day ? (
        <p className="notice">No games last night. Showing the latest game night, {formatEasternDay(day)}.</p>
      ) : null}

      <AppCta context="what last night did to YOUR collection" deepLink="/last-night" />

      <h2>Final scores</h2>
      <ul className="scores">
        {finals.map((g) => (
          <li key={g.id} className="card">
            <span>{g.away_team}</span> <strong className="mono">{g.away_score}</strong>
            <span className="muted"> at </span>
            <span>{g.home_team}</span> <strong className="mono">{g.home_score}</strong>
          </li>
        ))}
      </ul>

      <h2>Biggest movers</h2>
      <p className="muted small">
        Cards of players who played, with at least {data.thresholds.min_sample_size} active listings and a price above{' '}
        {formatCents(data.thresholds.min_price_cents)}. Change over 24 hours.
      </p>
      <div className="movers-grid">
        <section>
          <h3 className="gain">Up</h3>
          {data.gainers.length === 0 ? <p className="muted">No card moved up enough to list.</p> : null}
          <ol className="movers">
            {data.gainers.map((m) => (
              <MoverRow key={`${m.card_slug}-${m.parallel_name}-${m.grade}`} m={m} day={day} />
            ))}
          </ol>
        </section>
        <section>
          <h3 className="loss">Down</h3>
          {data.losers.length === 0 ? <p className="muted">No card moved down enough to list.</p> : null}
          <ol className="movers">
            {data.losers.map((m) => (
              <MoverRow key={`${m.card_slug}-${m.parallel_name}-${m.grade}`} m={m} day={day} />
            ))}
          </ol>
        </section>
      </div>

      <h2>Performances of the night</h2>
      <ol className="performances">
        {data.performances.map((p) => (
          <li key={p.player_slug} id={p.player_slug} className="card performance">
            <div className="performance__head">
              <Link href={`/players/${p.player_slug}`}>
                <strong>{p.player_name}</strong>
              </Link>
              <span className="muted small">
                {' '}
                {p.team ?? ''} · {p.away_team} {p.away_score}–{p.home_score} {p.home_team}
              </span>
            </div>
            <p className="mono">{statLine(p)}</p>
            {p.top_cards.length > 0 ? (
              <div className="foil-row">
                {p.top_cards.map((c) => (
                  <FoilCard
                    key={`${c.card_slug}-${c.parallel_name}-${c.grade}`}
                    href={`/cards/${c.card_slug}`}
                    number={c.card_number}
                    player={p.player_name}
                    setLabel={`${c.season} ${c.set_name}`}
                    parallelName={c.parallel_name}
                    serialRun={c.serial_run}
                    grade={c.grade}
                    isRookie={c.is_rookie}
                    footer={
                      <>
                        <span className="mono">{formatCents(c.after_cents)}</span>{' '}
                        {c.change_cents !== null && c.change_cents !== 0 ? (
                          <span className={`mono ${c.change_cents > 0 ? 'gain' : 'loss'}`}>{formatCentsDelta(c.change_cents)}</span>
                        ) : null}
                      </>
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="muted small">No priced card above the listing threshold yet.</p>
            )}
          </li>
        ))}
      </ol>

      <AppCta context="what last night did to YOUR collection" deepLink="/last-night" />
      <p className="muted small">
        <Link href="/last-night">Latest night</Link> · Archive: every game night has its own page.
      </p>
    </>
  );
}
