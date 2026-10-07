import Link from 'next/link';

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
          <Link href="/last-night">Last night in the card market</Link>
        </li>
        <li>
          <Link href="/rankings/rookies">Most valuable rookie cards</Link>
        </li>
        <li>
          <Link href="/sets">Checklists</Link>
        </li>
        <li>
          <Link href="/players">Players</Link>
        </li>
      </ul>
    </>
  );
}
