import Link from 'next/link';
import { formatEasternDay } from '@courtvault/shared';
import { moversPath } from '@/lib/paths';

/** Previous and next game night, from the archive list (newest first). */
export function NightPager({ days, current }: { days: { game_day: string }[]; current: string }) {
  const index = days.findIndex((d) => d.game_day === current);
  const newer = index > 0 ? days[index - 1] : null;
  const older = index >= 0 && index < days.length - 1 ? days[index + 1] : null;
  if (!newer && !older) return null;
  return (
    <nav className="pager" aria-label="Other nights">
      {older ? (
        <Link href={moversPath(older.game_day)} rel="prev">
          Previous night: {formatEasternDay(older.game_day)}
        </Link>
      ) : (
        <span />
      )}
      {newer ? (
        <Link href={moversPath(newer.game_day)} rel="next">
          Next night: {formatEasternDay(newer.game_day)}
        </Link>
      ) : null}
    </nav>
  );
}
