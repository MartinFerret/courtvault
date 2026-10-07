import { formatCents } from '@courtvault/shared';
import type { PlayerForm } from '@/lib/player-form';

const W = 640;
const TRACK = 96;
const GAP = 28;
const PAD_L = 16;
const PAD_R = 92;
const AXIS = 26;

function shortDay(day: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`));
}

function scale(values: (number | null)[], top: number): (v: number) => number {
  const nums = values.filter((v): v is number => v !== null);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  return (v: number) => top + 12 + (TRACK - 24) * (1 - (v - min) / span);
}

/**
 * Two tracks on the same dates: points per game (solid line, dots) above the value of the
 * player's reference card the morning after each game (dashed line). Server-rendered SVG, direct
 * labels on each track, no colour-only encoding. Under 3 games the caller shows numbers instead.
 */
export function FormPriceChart({ form }: { form: PlayerForm }) {
  const games = form.games;
  const n = games.length;
  const price = form.price && form.price.series.some((p) => p.cents !== null) ? form.price : null;
  const x = (i: number) => PAD_L + (n === 1 ? 0 : ((W - PAD_L - PAD_R) * i) / (n - 1));
  const points = games.map((g) => g.points ?? 0);
  const yPts = scale(points, 0);
  const priceTop = TRACK + GAP;
  const height = (price ? priceTop + TRACK : TRACK) + AXIS;
  const cents = price ? price.series.map((p) => p.cents) : [];
  const yPrice = price ? scale(cents, priceTop) : null;
  const ptsPath = games
    .map((g, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yPts(g.points ?? 0).toFixed(1)}`)
    .join(' ');
  const pricePath =
    price && yPrice
      ? price.series
          .map((p, i) =>
            p.cents === null ? null : `${x(i).toFixed(1)},${yPrice(p.cents).toFixed(1)}`,
          )
          .filter((s): s is string => s !== null)
          .map((s, i) => `${i === 0 ? 'M' : 'L'}${s}`)
          .join(' ')
      : '';
  const maxIdx = points.indexOf(Math.max(...points));
  const last = n - 1;
  const summary = `Points per game over the last ${n} games: ${points.join(', ')}.${
    price
      ? ` ${price.set_name} #${price.card_number} Base raw on the same mornings: ${cents.map((c) => (c === null ? 'no price' : formatCents(c))).join(', ')}.`
      : ''
  }`;
  return (
    <figure className="fpc">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={summary} className="fpc__svg">
        <text x={W - PAD_R + 10} y={yPts(points[last] ?? 0) + 4} className="fpc__label">
          Points
        </text>
        <path d={ptsPath} className="fpc__line fpc__line--points" />
        {games.map((g, i) => (
          <g key={`${g.day}-${i}`}>
            <circle
              cx={x(i)}
              cy={yPts(g.points ?? 0)}
              r={i === last ? 5 : 3.5}
              className="fpc__dot"
            />
            {i === maxIdx || i === last || i === 0 ? (
              <text
                x={i === last ? x(i) - 10 : x(i)}
                y={yPts(g.points ?? 0) - (i === last ? 2 : 10)}
                textAnchor={i === last ? 'end' : 'middle'}
                className="fpc__value"
              >
                {g.points ?? 0}
              </text>
            ) : null}
          </g>
        ))}
        {price && yPrice ? (
          <>
            <text
              x={W - PAD_R + 10}
              y={yPrice(cents[last] ?? price.current_cents) + 4}
              className="fpc__label"
            >
              Base, raw
            </text>
            <path d={pricePath} className="fpc__line fpc__line--price" />
            {price.series.map((p, i) =>
              p.cents === null ? null : (
                <g key={`${p.day}-${i}`}>
                  <circle
                    cx={x(i)}
                    cy={yPrice(p.cents)}
                    r={i === last ? 5 : 3.5}
                    className="fpc__dot fpc__dot--price"
                  />
                  {i === 0 || i === last ? (
                    <text
                      x={i === last ? x(i) - 10 : x(i)}
                      y={yPrice(p.cents) - (i === last ? 2 : 10)}
                      textAnchor={i === last ? 'end' : 'middle'}
                      className="fpc__value"
                    >
                      {formatCents(p.cents)}
                    </text>
                  ) : null}
                </g>
              ),
            )}
          </>
        ) : null}
        {games.map((g, i) =>
          n <= 6 || i === 0 || i === last || i % Math.ceil(n / 5) === 0 ? (
            <text
              key={`${g.day}-${i}`}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              className="fpc__axis"
            >
              {shortDay(g.day)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="muted small">{summary}</figcaption>
    </figure>
  );
}
