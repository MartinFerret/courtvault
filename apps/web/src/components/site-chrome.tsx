import Link from 'next/link';
import { PATHS } from '@/lib/paths';
import { NavLinks } from './nav-links';
import { LogoMark } from './logo';
import { DISCLAIMER, SITE_NAME } from '@/lib/site';

const NAV = [
  { href: PATHS.players, label: 'Players' },
  { href: PATHS.checklists, label: 'Checklists' },
  { href: PATHS.rookies, label: 'Rookie rankings' },
  { href: PATHS.movers, label: 'Last night' },
];

/** Sticky header: brand, the card-values pages, one action. Identical on every page (R46). */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__row">
        <Link href="/" className="brand" aria-label={`${SITE_NAME} home`}>
          <LogoMark size={34} className="brand__mark" />
          <span>{SITE_NAME}</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <NavLinks items={NAV} />
        </nav>
        <Link
          href="/waitlist"
          className="button button--small site-header__cta"
          data-attr="cta-navbar"
        >
          Join the waitlist
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <p className="site-footer__brand">
            <LogoMark size={44} className="brand__mark" />
            <span>{SITE_NAME}</span>
          </p>
          <p className="site-footer__pitch">
            Card values updated every night, next to how the players played.
          </p>
          <p className="muted small">
            Prices are median asking prices from active eBay listings, not sold prices. Set and
            player names are used for identification only. No official imagery.
          </p>
          <p className="muted small">{DISCLAIMER}</p>
        </div>
        <nav aria-label="Card values">
          <p className="site-footer__title">Card values</p>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Legal">
          <p className="site-footer__title">Legal</p>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/account-deletion">Account deletion</Link>
        </nav>
        <nav aria-label="Company">
          <p className="site-footer__title">Company</p>
          <Link href={PATHS.method}>How we price cards</Link>
          <Link href="/waitlist">Waitlist</Link>
        </nav>
        <div>
          <p className="site-footer__title">Community</p>
          <p className="muted small">
            Discord, X, Instagram, TikTok and YouTube open with the app.
          </p>
        </div>
      </div>
      <div className="container">
        <p className="muted small">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
