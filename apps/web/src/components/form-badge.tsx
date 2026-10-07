import Link from 'next/link';
import { PATHS } from '@/lib/paths';

/**
 * Hot or cold form, from stats only: points + rebounds + assists over the last 5 games against
 * the season average (rule on /how-we-price-cards#form). Nothing is shown under 10 games.
 */
export function FormBadge({ badge }: { badge: 'hot' | 'cold' | null | undefined }) {
  if (!badge) return null;
  return (
    <Link
      href={`${PATHS.method}#form`}
      className={`form-badge form-badge--${badge}`}
      title="Last 5 games against the season average, points + rebounds + assists. Stats only."
    >
      {badge === 'hot' ? 'Hot form' : 'Cold form'}
    </Link>
  );
}
