import Link from 'next/link';
import { PATHS } from '@/lib/paths';
import { SiteNav } from './nav-links';
import { LogoMark } from './logo';
import { HeaderCta } from './session-cta';
import { DISCLAIMER, SITE_NAME } from '@/lib/site';
import { LEGAL_ENTITY } from '@courtvault/shared';
import { IMAGE_CREDIT, hasOfficialImages } from '@/lib/images';

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
          <LogoMark size={30} className="brand__mark" />
          <span>{SITE_NAME}</span>
        </Link>
        <HeaderCta />
        <SiteNav items={NAV} />
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
            Values come from eBay sales and listings through CardSight AI: recent auction sales when
            there are enough, otherwise current asking prices, each labelled. Set and player names
            are used for identification only.
            {hasOfficialImages() ? ` ${IMAGE_CREDIT}` : ''}
          </p>
          <p className="muted small">{DISCLAIMER}</p>
          <p className="muted small">
            Operated by {LEGAL_ENTITY.name}, {LEGAL_ENTITY.addressLines[1]}, France. SIREN{' '}
            {LEGAL_ENTITY.siren}. <Link href="/legal/terms#operator">Legal notice</Link>
          </p>
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
          <Link href={PATHS.scoring}>Fantasy scoring rules</Link>
          <Link href="/waitlist">iPhone and Android waitlist</Link>
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
