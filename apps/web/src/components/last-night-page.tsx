import Link from 'next/link';
import { formatCents, formatCentsDelta, formatEasternDay, formatPercent, PRICE_LABEL } from '@courtvault/shared';
import { AppCta } from './app-cta';
import { FoilCard } from './foil-card';
import { JsonLd } from './json-ld';
import { absoluteUrl } from '@/lib/site';
import type { LastNight, Mover, StatLine } from '@/lib/last-night';

export function lastNightTitle(day: string): string {
  return `Last night in the card market: ${formatEasternDay(day)}`;
}

function shortLine(l: StatLine): string {
  return `${l.points ?? 0} pts · ${l.rebounds ?? 0} reb · ${l.assists ?? 0} ast`;
}

function MoverCard({ m }: { m: Mover }) {
  const cls = m.change_cents > 0 ? 'gain' : 'loss';
  return (
    <li>
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
            <span className={`mover__pct ${cls}`}>{formatPercent(m.change_pct)}</span>
            <span className="mover__prices">
              {formatCents(m.before_cents)} → {formatCents(m.after_cents)}
            </span>
            {m.line ? <span className="mover__stat">{shortLine(m.line)}</span> : null}
          </>
        }
      />
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
    <article className="ln">
      <JsonLd data={jsonLd} />

      <header className="ln__hero">
        <p className="ln__eyebrow">
          <Link href="/last-night">Last night</Link> · {formatEasternDay(day)}
          {data.is_off_day && !data.requested_day ? <span className="muted"> · no games last night, latest game night shown</span> : null}
        </p>
        <h1 className="ln__title">
          {data.games.length} game{data.games.length > 1 ? 's' : ''}.
          <br />
          {data.gainers.length + data.losers.length} cards moved.
        </h1>
        <ul className="ln__scores" aria-label="Final scores">
          {finals.map((g) => (
            <li key={g.id}>
              <span>{g.away_team}</span>
              <strong>{g.away_score}</strong>
              <span className="ln__at">at</span>
              <span>{g.home_team}</span>
              <strong>{g.home_score}</strong>
            </li>
          ))}
        </ul>
      </header>

      <AppCta context="what last night did to YOUR collection" deepLink="/last-night" />

      <section className="ln__section">
        <div className="ln__movers">
          <div>
            <h2 className="ln__h2 gain">Up</h2>
            {data.gainers.length === 0 ? <p className="muted">Nothing moved up enough to list.</p> : null}
            <ol className="ln__list">
              {data.gainers.map((m) => (
                <MoverCard key={`${m.card_slug}-${m.parallel_name}-${m.grade}`} m={m} />
              ))}
            </ol>
          </div>
          <div>
            <h2 className="ln__h2 loss">Down</h2>
            {data.losers.length === 0 ? <p className="muted">Nothing moved down enough to list.</p> : null}
            <ol className="ln__list">
              {data.losers.map((m) => (
                <MoverCard key={`${m.card_slug}-${m.parallel_name}-${m.grade}`} m={m} />
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="ln__section">
        <h2 className="ln__h2">Performances of the night</h2>
        <ol className="ln__perf">
          {data.performances.map((p, i) => (
            <li key={p.player_slug} id={p.player_slug} className="perf">
              <div className="perf__rank">{i + 1}</div>
              <div className="perf__body">
                <div className="perf__head">
                  <Link href={`/players/${p.player_slug}`} className="perf__name">
                    {p.player_name}
                  </Link>
                  <span className="perf__game">
                    {p.away_team} {p.away_score}–{p.home_score} {p.home_team}
                  </span>
                </div>
                <div className="perf__stats">
                  <span className="perf__big">{p.points ?? 0}</span>
                  <span className="perf__label">pts</span>
                  <span className="perf__sep" />
                  <span>{p.rebounds ?? 0} reb</span>
                  <span>{p.assists ?? 0} ast</span>
                  <span>{p.steals ?? 0} stl</span>
                  <span>{p.blocks ?? 0} blk</span>
                </div>
                {p.top_cards.length > 0 ? (
                  <div className="foil-row">
                    {p.top_cards.map((c) => (
                      <FoilCard
                        key={`${c.card_slug}-${c.parallel_name}-${c.grade}`}
                        compact
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
                            <span className="mono">{formatCents(c.after_cents)}</span>
                            {c.change_cents ? <span className={`mono ${c.change_cents > 0 ? 'gain' : 'loss'}`}> {formatCentsDelta(c.change_cents)}</span> : null}
                          </>
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <AppCta context="what last night did to YOUR collection" deepLink="/last-night" />

      <p className="ln__footnote">
        {PRICE_LABEL} from active eBay listings, not sold prices. Prices compared before tip-off and after the next morning&apos;s
        update, for cards of players who played, with at least {data.thresholds.min_sample_size} listings and a price above{' '}
        {formatCents(data.thresholds.min_price_cents)}. Prices move for many reasons: this page reports what moved, not why.
      </p>
    </article>
  );
}
