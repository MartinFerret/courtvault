import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LEGAL_ENTITY } from '@courtvault/shared';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What data the app stores (email, collection, follows, alerts, private card photos) and how to export or delete it.',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <article className="prose">
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Privacy', href: '/legal/privacy' },
        ]}
      />
      <h1>Privacy policy</h1>
      <p className="muted small">Draft. To be reviewed by counsel before launch.</p>
      <h2>Who is responsible</h2>
      <p>
        The data controller is {LEGAL_ENTITY.name} (SIREN {LEGAL_ENTITY.siren}),{' '}
        {LEGAL_ENTITY.addressLines.join(', ')}. Write to{' '}
        <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>{LEGAL_ENTITY.contactEmail}</a> for any
        request about your data. Data is stored in the European Union (Supabase, Ireland region).
      </p>
      <h2>What we collect</h2>
      <p>
        Your email address (sign-in and waitlist), the cards you add to your collection, the players
        you follow, your price alerts, a push notification token if you opt in, and the photos you
        choose to take of your cards. Photos are private, stored as small thumbnails, and never
        shown publicly.
      </p>
      <h2>Payments</h2>
      <p>
        Subscriptions are processed by Apple or Google and managed through RevenueCat. We receive
        your subscription status, never your payment details.
      </p>
      <h2>Your rights</h2>
      <p>
        You can export your collection (Premium) and delete your account and all associated data
        from the app at any time. Contact us at the address above for any request about your data.
      </p>
    </article>
  );
}
