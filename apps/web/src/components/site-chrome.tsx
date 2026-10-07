import Link from 'next/link';
import { DISCLAIMER, SITE_NAME } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label={`${SITE_NAME} home`}>
          {SITE_NAME}
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/last-night">Last night</Link>
          <Link href="/sets">Sets</Link>
          <Link href="/players">Players</Link>
          <Link href="/rankings/rookies">Rookie rankings</Link>
          <Link href="/waitlist">Get the app</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>{DISCLAIMER}</p>
        <p>
          Prices are median asking prices from active eBay listings, not sold prices. Set and player
          names are used for identification only.
        </p>
        <nav aria-label="Legal" className="nav">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/account-deletion">Account deletion</Link>
        </nav>
        <p>
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
