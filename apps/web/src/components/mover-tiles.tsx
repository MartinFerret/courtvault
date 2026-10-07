import Link from 'next/link';
import { formatCents, formatParallel, GRADE_LABELS } from '@courtvault/shared';
import type { Mover } from '@/lib/last-night';
import { cardPath } from '@/lib/paths';
import { CardVisual } from './card-visual';
import type { PricePoint } from './price-history';
import type { SlugMaps } from './last-night-page';

export interface MoverWithHistory {
  mover: Mover;
  history: PricePoint[];
}

const W = 160;
const H = 44;

function Spark({ points, up }: { points: PricePoint[]; up: boolean }) {
  if (points.length < 2) return null;
  const t0 = new Date(points[0]!.captured_at).getTime();
  const t1 = new Date(points[points.length - 1]!.captured_at).getTime();
  const span = t1 - t0 || 1;
  const min = Math.min(...points.map((p) => p.price_cents));
  const max = Math.max(...points.map((p) => p.price_cents));
  const range = max - min || 1;
  const x = (iso: string) => ((new Date(iso).getTime() - t0) / span) * (W - 6) + 3;
  const y = (c: number) => 4 + (1 - (c - min) / range) * (H - 8);
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${x(p.captured_at).toFixed(1)},${y(p.price_cents).toFixed(1)}`,
    )
    .join(' ');
  const last = points[points.length - 1]!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mtile__spark" aria-hidden="true">
      <path
        d={`${d} L${x(last.captured_at).toFixed(1)},${H} L3,${H} Z`}
        className={`mtile__area ${up ? 'mtile__area--up' : 'mtile__area--down'}`}
      />
      <path d={d} className={`mtile__line ${up ? 'mtile__line--up' : 'mtile__line--down'}`} />
      <circle
        cx={x(last.captured_at)}
        cy={y(last.price_cents)}
        r="3"
        className={up ? 'mtile__dot--up' : 'mtile__dot--down'}
      />
    </svg>
  );
}

/** The night's biggest moves as quote tiles: change, price, 90-day sparkline, the card. */
export function MoverTiles({ items, slugs }: { items: MoverWithHistory[]; slugs: SlugMaps }) {
  if (items.length === 0) return null;
  return (
    <ul className="mtiles">
      {items.map(({ mover: m, history }) => {
        const up = m.change_cents > 0;
        const slug = slugs.cards.get(m.card_slug) ?? m.card_slug;
        return (
          <li
            key={`${m.card_slug}-${m.parallel_name}-${m.grade}`}
            className={`mtile ${up ? 'mtile--up' : 'mtile--down'}`}
          >
            <Link href={cardPath(slug)} className="mtile__link">
              <span className="mtile__visual">
                <CardVisual
                  publicSlug={slug}
                  name={`${m.season} ${m.set_name} ${m.player_name} ${m.is_rookie ? 'rookie card' : 'card'} #${m.card_number}`}
                  number={m.card_number}
                  parallelName={m.parallel_name}
                  serialRun={m.serial_run}
                  isRookie={m.is_rookie}
                  size="thumb"
                />
              </span>
              <span className="mtile__body">
                <span className="mtile__name">
                  {m.player_name} <span className="mtile__num">#{m.card_number}</span>
                </span>
                <span className="mtile__meta">
                  {formatParallel(m.parallel_name, m.serial_run)}, {GRADE_LABELS[m.grade]}
                </span>
                <span className="mtile__price">{formatCents(m.after_cents)}</span>
                <span className="mtile__change">
                  {up ? '+' : ''}
                  {m.change_pct.toFixed(1)}%
                  <span className="mtile__since">
                    since tip-off, from {formatCents(m.before_cents)}
                  </span>
                </span>
              </span>
              <span className="mtile__chart">
                <Spark points={history} up={up} />
                <span className="mtile__period">{history.length >= 2 ? '90 days' : ''}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
