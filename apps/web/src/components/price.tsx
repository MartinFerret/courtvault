import { formatCents, formatCentsDelta, PRICE_LABEL } from '@courtvault/shared';

export function Price({ cents }: { cents: number | null | undefined }) {
  return <span className="mono">{formatCents(cents)}</span>;
}

export function Delta({ cents }: { cents: number | null | undefined }) {
  if (cents === null || cents === undefined) return <span className="muted">—</span>;
  const cls = cents > 0 ? 'gain' : cents < 0 ? 'loss' : 'muted';
  return <span className={`mono ${cls}`}>{formatCentsDelta(cents)}</span>;
}

export function PriceNote() {
  return (
    <p className="price-note">
      {PRICE_LABEL} from active eBay listings (asking prices, not sold prices).
    </p>
  );
}
