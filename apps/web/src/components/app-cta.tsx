import Link from 'next/link';
import { APP_SCHEME } from '@/lib/site';

/**
 * Call to action toward the app, on every page. Until the app is published the primary
 * action is the waitlist; the deep link is kept for devices that already have the app.
 */
export function AppCta({ deepLink, context }: { deepLink?: string; context?: string }) {
  return (
    <aside className="cta" aria-labelledby="cta-title">
      <h2 id="cta-title">Track {context ?? 'your cards'} in the app</h2>
      <p className="muted">
        Scan a card, see its value by parallel and grade, and get every morning how last
        night&apos;s games moved your collection.
      </p>
      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link className="button" href="/waitlist">
          Join the waitlist
        </Link>
        {deepLink ? (
          <a className="button secondary" href={`${APP_SCHEME}${deepLink.replace(/^\//, '')}`}>
            Open in the app
          </a>
        ) : null}
      </p>
    </aside>
  );
}
