import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DISCLAIMER, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms of service', alternates: { canonical: '/legal/terms' } };

export default function TermsPage() {
  return (
    <article className="prose">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Terms', href: '/legal/terms' }]} />
      <h1>Terms of service</h1>
      <p className="muted small">Draft. To be reviewed by counsel before launch.</p>
      <h2>Service</h2>
      <p>
        {SITE_NAME} provides a catalog of basketball trading cards and tools to track a personal collection. Values
        are estimates derived from public listings and are provided for information only.
      </p>
      <h2>Prices</h2>
      <p>
        Prices shown are median asking prices from active eBay listings. They are not sold prices, appraisals or
        offers to buy. Buy links may be affiliate links.
      </p>
      <h2>Accounts and subscriptions</h2>
      <p>
        Premium subscriptions are purchased through the Apple App Store or Google Play and are governed by their
        terms. You can cancel at any time from your store account. You can delete your account from the app.
      </p>
      <h2>Content</h2>
      <p>
        Photos you take of your cards remain yours and stay private. Player names and game statistics are factual
        information. {DISCLAIMER}
      </p>
    </article>
  );
}
