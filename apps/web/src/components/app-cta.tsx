import Link from 'next/link';
import { SignUpOrVault } from './session-cta';

/**
 * Call to action on catalog pages: the web app (app.hoopticker.com), or "Open my Vault" for
 * signed-in visitors. The iPhone and Android apps are not published yet: waitlist link.
 */
export function AppCta({
  context,
  campaign = 'cta-block',
}: {
  context?: string;
  campaign?: string;
}) {
  return (
    <aside className="cta" aria-labelledby="cta-title">
      <h2 id="cta-title">Track {context ?? 'your cards'} in HoopTicker</h2>
      <p className="muted">
        See every card&apos;s value by parallel and grade, and get every morning how last
        night&apos;s games moved your collection. Free in your browser.
      </p>
      <p>
        <SignUpOrVault campaign={campaign} />
      </p>
      <p className="muted small">
        iPhone or Android? <Link href="/waitlist">Join the app waitlist</Link>.
      </p>
    </aside>
  );
}
