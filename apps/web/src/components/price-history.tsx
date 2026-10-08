import { formatCents } from '@courtvault/shared';

export interface PricePoint {
  captured_at: string;
  price_cents: number;
  sample_size: number;
}

const W = 640;
const H = 150;
const PAD = 14;

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(iso));
}

/** 90 days of the Base raw value, one point per recorded change. Server-rendered SVG. */
export function PriceHistory({ points }: { points: PricePoint[] }) {
  if (points.length < 2) return null;
  const t0 = new Date(points[0]!.captured_at).getTime();
  const t1 = new Date(points[points.length - 1]!.captured_at).getTime();
  const span = t1 - t0 || 1;
  const min = Math.min(...points.map((p) => p.price_cents));
  const max = Math.max(...points.map((p) => p.price_cents));
  const range = max - min || 1;
  const x = (iso: string) => PAD + ((new Date(iso).getTime() - t0) / span) * (W - PAD * 2);
  const y = (cents: number) => PAD + (1 - (cents - min) / range) * (H - PAD * 2 - 20);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${x(p.captured_at).toFixed(1)},${y(p.price_cents).toFixed(1)}`,
    )
    .join(' ');
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const change = last.price_cents - first.price_cents;
  const summary = `Base raw value from ${shortDate(first.captured_at)} (${formatCents(first.price_cents)}) to ${shortDate(last.captured_at)} (${formatCents(last.price_cents)}), ${points.length} recorded changes.`;
  return (
    <figure className="ph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="ph__svg">
        <path d={path} className="ph__line" />
        <circle cx={x(last.captured_at)} cy={y(last.price_cents)} r="5" className="ph__dot" />
        <text x={PAD} y={H - 4} className="ph__axis">
          {shortDate(first.captured_at)}
        </text>
        <text x={W - PAD} y={H - 4} textAnchor="end" className="ph__axis">
          {shortDate(last.captured_at)}
        </text>
        <text
          x={x(last.captured_at) - 10}
          y={y(last.price_cents) - 10}
          textAnchor="end"
          className="ph__value"
        >
          {formatCents(last.price_cents)}
        </text>
      </svg>
      <figcaption className="muted small">
        {summary}{' '}
        {change === 0
          ? 'No change over the period.'
          : `${change > 0 ? 'Up' : 'Down'} ${formatCents(Math.abs(change))} over the period.`}
      </figcaption>
    </figure>
  );
}
