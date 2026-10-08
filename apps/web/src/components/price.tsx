import Link from 'next/link';
import {
  formatCents,
  formatCentsDelta,
  PRICE_LABEL_NOTE,
  PRICE_SOURCE_CREDIT,
  priceKindLabel,
} from '@courtvault/shared';
import { PATHS } from '@/lib/paths';

export function Price({ cents }: { cents: number | null | undefined }) {
  return <span className="mono">{formatCents(cents)}</span>;
}

export function Delta({ cents }: { cents: number | null | undefined }) {
  if (cents === null || cents === undefined) return <span className="muted">–</span>;
  const cls = cents > 0 ? 'gain' : cents < 0 ? 'loss' : 'muted';
  return <span className={`mono ${cls}`}>{formatCentsDelta(cents)}</span>;
}

/** A figure with its state under it: recent auction sales, last auction sale, current asking price. */
export function PriceWithKind({
  cents,
  kind,
  saleAt,
}: {
  cents: number | null | undefined;
  kind: string | null | undefined;
  saleAt?: string | null;
}) {
  if (cents === null || cents === undefined) return <span className="muted">–</span>;
  return (
    <span className="price-cell">
      <span className="mono">{formatCents(cents)}</span>
      <span className="price-kind">{priceKindLabel(kind, saleAt)}</span>
    </span>
  );
}

export function PriceNote() {
  return (
    <p className="price-note">
      {PRICE_LABEL_NOTE} {PRICE_SOURCE_CREDIT} <Link href={PATHS.method}>How we price cards</Link>
    </p>
  );
}
