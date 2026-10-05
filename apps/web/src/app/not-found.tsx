import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p className="muted">This card, player or set is not in the catalog.</p>
      <p>
        <Link className="button" href="/">
          Back to home
        </Link>
      </p>
    </>
  );
}
