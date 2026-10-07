import Link from 'next/link';
import { PATHS } from '@/lib/paths';

/** R59: a real 404 (status set by Next.js) with links to the main pages. */
export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p className="muted">
        This card, player or set is not in the catalog, or the address has changed.
      </p>
      <ul>
        <li>
          <Link href="/">Basketball card collection tracker</Link>
        </li>
        <li>
          <Link href={PATHS.movers}>Last night in the card market</Link>
        </li>
        <li>
          <Link href={PATHS.rookies}>Most valuable rookie cards</Link>
        </li>
        <li>
          <Link href={PATHS.checklists}>Checklists</Link>
        </li>
        <li>
          <Link href={PATHS.players}>Players</Link>
        </li>
      </ul>
    </>
  );
}
