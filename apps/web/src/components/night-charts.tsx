import Link from 'next/link';
import { formatCents, formatCentsDelta, formatParallel, GRADE_LABELS } from '@courtvault/shared';
import type { Game, LastNight, Mover, Performance } from '@/lib/last-night';
import { cardPath, playerPath } from '@/lib/paths';
import type { SlugMaps } from './last-night-page';

/** Points scored by the performance line, never null for display. */
const pts = (p: Performance) => p.points ?? 0;

/** The best line of a game: the performance whose matchup is this game. */
function topLineOf(game: Game, performances: Performance[]): Performance | null {
  return (
    [...performances]
      .filter((p) => p.home_team === game.home_team && p.away_team === game.away_team)
      .sort((a, b) => pts(b) - pts(a))[0] ?? null
  );
}

/** Reference card move of a performance: Base raw first, then any card that changed. */
function cardMove(p: Performance) {
  return (
    p.top_cards.find(
      (c) => c.parallel_name === 'Base' && c.grade === 'RAW' && c.change_cents !== null,
    ) ??
    p.top_cards.find((c) => c.change_cents !== null) ??
    null
  );
}

/** Final scores as cards: both teams, the margin bar, the best line of the game. */
export function GameCards({ data, slugs }: { data: LastNight; slugs: SlugMaps }) {
  const finals = data.games.filter((g) => g.home_score !== null && g.away_score !== null);
  if (finals.length === 0) return null;
  return (
    <ul className="games" aria-label="Final scores">
      {finals.map((g) => {
        const away = g.away_score ?? 0;
        const home = g.home_score ?? 0;
        const total = away + home || 1;
        const top = topLineOf(g, data.performances);
        const homeWon = home > away;
        return (
          <li key={g.id} className="game">
            <div className="game__row">
              <span className={`game__team${!homeWon ? ' game__team--won' : ''}`}>
                {g.away_team}
              </span>
              <span className="game__score">{away}</span>
            </div>
            <div className="game__row">
              <span className={`game__team${homeWon ? ' game__team--won' : ''}`}>
                {g.home_team}
              </span>
              <span className="game__score">{home}</span>
            </div>
            <div className="game__bar" aria-hidden="true">
              <span
                style={{ width: `${(away / total) * 100}%` }}
                className={!homeWon ? 'game__bar--won' : ''}
              />
              <span
                style={{ width: `${(home / total) * 100}%` }}
                className={homeWon ? 'game__bar--won' : ''}
              />
            </div>
            {top ? (
              <p className="game__top">
                <Link href={playerPath(slugs.players.get(top.player_slug) ?? top.player_slug)}>
                  {top.player_name}
                </Link>{' '}
                {pts(top)} pts, {top.rebounds ?? 0} reb, {top.assists ?? 0} ast
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Horizontal bars of the night's top lines by points, with the reference card move. */
export function PerformanceBars({
  data,
  slugs,
  limit = 10,
}: {
  data: LastNight;
  slugs: SlugMaps;
  limit?: number;
}) {
  const rows = [...data.performances].sort((a, b) => pts(b) - pts(a)).slice(0, limit);
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map(pts), 1);
  return (
    <ol className="pbars" aria-label="Top performances by points">
      {rows.map((p, i) => {
        const move = cardMove(p);
        return (
          <li key={p.player_slug} className="pbar">
            <span className="pbar__rank">{i + 1}</span>
            <span className="pbar__who">
              <Link href={playerPath(slugs.players.get(p.player_slug) ?? p.player_slug)}>
                {p.player_name}
              </Link>
              {p.is_rookie ? <span className="badge">RC</span> : null}
              <span className="muted small">{p.team}</span>
            </span>
            <span className="pbar__track" aria-hidden="true">
              <span
                className={`pbar__fill${p.is_rookie ? ' pbar__fill--rookie' : ''}`}
                style={{ width: `${(pts(p) / max) * 100}%` }}
              />
            </span>
            <span className="pbar__pts">
              <strong>{pts(p)}</strong> pts
              <span className="muted small">
                {p.rebounds ?? 0} reb, {p.assists ?? 0} ast
              </span>
            </span>
            {move ? (
              <Link
                href={cardPath(slugs.cards.get(move.card_slug) ?? move.card_slug)}
                className={`pbar__move ${move.change_cents! > 0 ? 'gain' : move.change_cents! < 0 ? 'loss' : 'muted'}`}
              >
                {move.change_cents === 0 ? 'no change' : formatCentsDelta(move.change_cents)}
                <span className="muted small">
                  #{move.card_number} {formatParallel(move.parallel_name, move.serial_run)}
                </span>
              </Link>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const SW = 640;
const SH = 320;
const SP = { l: 56, r: 24, t: 24, b: 44 };

/** Points scored against the overnight change of the reference card, one dot per player. */
export function PointsVsValue({ data, slugs }: { data: LastNight; slugs: SlugMaps }) {
  const points = data.performances
    .map((p) => {
      const move = cardMove(p);
      if (!move || move.change_cents === null) return null;
      const before = move.after_cents - move.change_cents;
      if (before <= 0) return null;
      return { p, pct: (move.change_cents / before) * 100, move };
    })
    .filter(
      (x): x is { p: Performance; pct: number; move: NonNullable<ReturnType<typeof cardMove>> } =>
        x !== null,
    );
  if (points.length < 3) return null;
  const maxPts = Math.max(...points.map((x) => pts(x.p)), 10);
  const maxAbs = Math.max(...points.map((x) => Math.abs(x.pct)), 1);
  const x = (v: number) => SP.l + (v / maxPts) * (SW - SP.l - SP.r);
  const y = (v: number) => SP.t + (1 - (v + maxAbs) / (2 * maxAbs)) * (SH - SP.t - SP.b);
  const labelled = [...points].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 5);
  const summary = `${points.length} players: points scored last night against the change of their reference card's value since tip-off. Largest move: ${labelled[0]!.p.player_name}, ${labelled[0]!.pct.toFixed(1)}%.`;
  return (
    <figure className="pvv">
      <svg viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label={summary} className="pvv__svg">
        <line x1={SP.l} x2={SW - SP.r} y1={y(0)} y2={y(0)} className="pvv__zero" />
        <line x1={SP.l} x2={SP.l} y1={SP.t} y2={SH - SP.b} className="pvv__axis" />
        <text x={SW - SP.r} y={SH - 12} textAnchor="end" className="pvv__label">
          points scored
        </text>
        <text x={12} y={SP.t + 4} className="pvv__label">
          +{maxAbs.toFixed(0)}%
        </text>
        <text x={12} y={SH - SP.b} className="pvv__label">
          -{maxAbs.toFixed(0)}%
        </text>
        <text x={12} y={y(0) + 4} className="pvv__label">
          0%
        </text>
        {points.map((pt) => (
          <circle
            key={pt.p.player_slug}
            cx={x(pts(pt.p))}
            cy={y(pt.pct)}
            r={pt.p.is_rookie ? 7 : 5}
            className={`pvv__dot${pt.pct > 0 ? ' pvv__dot--up' : pt.pct < 0 ? ' pvv__dot--down' : ''}${pt.p.is_rookie ? ' pvv__dot--rookie' : ''}`}
          />
        ))}
        {labelled.map((pt) => {
          const right = x(pts(pt.p)) > SW * 0.7;
          return (
            <text
              key={`l-${pt.p.player_slug}`}
              x={right ? x(pts(pt.p)) - 10 : x(pts(pt.p)) + 10}
              y={y(pt.pct) - 9}
              textAnchor={right ? 'end' : 'start'}
              className="pvv__name"
            >
              {pt.p.player_name}
            </text>
          );
        })}
        <line x1={SP.l} x2={SW - SP.r} y1={SH - SP.b} y2={SH - SP.b} className="pvv__axis" />
        {[0, Math.round(maxPts / 2), maxPts].map((v) => (
          <text key={v} x={x(v)} y={SH - SP.b + 16} textAnchor="middle" className="pvv__label">
            {v}
          </text>
        ))}
      </svg>
      <figcaption className="muted small">
        Each dot is a player who played: points scored, and how the value of his reference
        card (Base raw when priced) moved between tip-off and this morning. Lime dots are rookies.{' '}
        {labelled.slice(0, 3).map((pt, i) => (
          <span key={pt.p.player_slug}>
            {i > 0 ? ', ' : ''}
            <Link href={cardPath(slugs.cards.get(pt.move.card_slug) ?? pt.move.card_slug)}>
              {pt.p.player_name}
            </Link>{' '}
            {pt.pct > 0 ? '+' : ''}
            {pt.pct.toFixed(1)}%
          </span>
        ))}
        .
      </figcaption>
    </figure>
  );
}

/** Diverging bars: gainers to the right, losers to the left, by percent change. */
export function MoverBars({
  gainers,
  losers,
  slugs,
}: {
  gainers: Mover[];
  losers: Mover[];
  slugs: SlugMaps;
}) {
  const rows = [...gainers.slice(0, 8), ...losers.slice(0, 8)];
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((m) => Math.abs(m.change_pct)), 1);
  return (
    <ol className="mbars" aria-label="Biggest movers since tip-off">
      {rows.map((m) => {
        const up = m.change_cents > 0;
        return (
          <li key={`${m.card_slug}-${m.parallel_name}-${m.grade}`} className="mbar">
            <Link
              href={cardPath(slugs.cards.get(m.card_slug) ?? m.card_slug)}
              className="mbar__who"
            >
              #{m.card_number} {m.player_name}
              <span className="muted small">
                {formatParallel(m.parallel_name, m.serial_run)}, {GRADE_LABELS[m.grade]}, {m.season}{' '}
                {m.set_name}
              </span>
            </Link>
            <span className="mbar__track" aria-hidden="true">
              <span className="mbar__half">
                {!up ? (
                  <span
                    className="mbar__fill mbar__fill--loss"
                    style={{ width: `${(Math.abs(m.change_pct) / max) * 100}%` }}
                  />
                ) : null}
              </span>
              <span className="mbar__half">
                {up ? (
                  <span
                    className="mbar__fill mbar__fill--gain"
                    style={{ width: `${(Math.abs(m.change_pct) / max) * 100}%` }}
                  />
                ) : null}
              </span>
            </span>
            <span className={`mbar__pct ${up ? 'gain' : 'loss'}`}>
              {up ? '+' : ''}
              {m.change_pct.toFixed(1)}%
              <span className="muted small">
                {formatCents(m.before_cents)} to {formatCents(m.after_cents)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
