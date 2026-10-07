import Link from 'next/link';

/**
 * Call to action on every page. The app is not published yet: the only action is the
 * waitlist. Deep links come back with the store listings.
 */
export function AppCta({ context }: { context?: string }) {
  return (
    <aside className="cta" aria-labelledby="cta-title">
      <h2 id="cta-title">Track {context ?? 'your cards'} in the app</h2>
      <p className="muted">
        Scan a card, see its value by parallel and grade, and get every morning how last
        night&apos;s games moved your collection.
      </p>
      <p>
        <Link className="button" href="/waitlist" data-attr="cta-block">
          Join the waitlist
        </Link>
      </p>
    </aside>
  );
}
