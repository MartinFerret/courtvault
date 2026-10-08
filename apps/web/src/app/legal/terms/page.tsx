import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LEGAL_ENTITY, PRICE_SOURCE_NAME } from '@courtvault/shared';
import { DISCLAIMER, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'Terms of service for the card catalog and collection tracker: where values come from, acceptable use of the data, subscriptions through the app stores.',
  alternates: { canonical: '/legal/terms' },
};

export default function TermsPage() {
  return (
    <article className="prose">
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Terms', href: '/legal/terms' },
        ]}
      />
      <h1>Terms of service</h1>
      <p className="muted small">Draft. To be reviewed by counsel before launch.</p>
      <h2 id="operator">Operator and legal notice</h2>
      <p>
        {SITE_NAME} is operated by {LEGAL_ENTITY.name}, sole trader registered in France (SIREN{' '}
        {LEGAL_ENTITY.siren}), {LEGAL_ENTITY.addressLines.join(', ')}. Contact:{' '}
        <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>{LEGAL_ENTITY.contactEmail}</a>. The
        website is hosted by Netlify, Inc. (San Francisco, USA), the web app by Cloudflare, Inc.
        (San Francisco, USA), and account data by Supabase, Inc. (Singapore) in the European Union.
      </p>
      <h2>Service</h2>
      <p>
        {SITE_NAME} provides a catalog of basketball trading cards and tools to track a personal
        collection. Values are estimates derived from public listings and are provided for
        information only.
      </p>
      <h2>Prices</h2>
      <p>
        Values come from eBay sales and listings supplied by {PRICE_SOURCE_NAME}: the median of
        recent auction sales when there are enough, the last auction sale otherwise, or the current
        asking price. Each value says which. They are not appraisals or offers to buy, and a sale
        can close at another price. Buy links may be affiliate links.
      </p>
      <h2>Acceptable use of the data</h2>
      <p>
        Price and catalog data are licensed to {SITE_NAME} for display on this website and in the
        app. You may use them for your personal collection. You may not scrape, crawl, copy,
        extract, store in bulk, resell, publish or otherwise redistribute prices or catalog data,
        nor access the website, the app or their data by automated means, nor use them to build a
        competing dataset or service. Accounts that do so may be closed and access blocked. These
        restrictions protect the terms under which the data is supplied to us.
      </p>
      <h2>Accounts and subscriptions</h2>
      <p>
        Premium subscriptions are purchased through the Apple App Store or Google Play and are
        governed by their terms. You can cancel at any time from your store account. You can delete
        your account from the app.
      </p>
      <h2>Content</h2>
      <p>
        Photos you take of your cards remain yours and stay private. Player names and game
        statistics are factual information. {DISCLAIMER}
      </p>
    </article>
  );
}
