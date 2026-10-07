import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { joinWaitlist } from './actions';
import { WaitlistForm } from './form';
import { NOINDEX_ROBOTS } from '@/lib/site';

export const metadata: Metadata = {
  ...NOINDEX_ROBOTS,
  title: 'Get the app',
  description:
    'Join the waitlist for the app: scan your cards, track their value, and see every morning how last night moved your collection.',
  alternates: { canonical: '/waitlist' },
};

export default function WaitlistPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Get the app', href: '/waitlist' },
        ]}
      />
      <h1>Get the app</h1>
      <p className="muted">
        iOS and Android. Scan a card, see its value by parallel and grade, track your collection,
        and get a “Last night” report every morning. Leave your email and we will tell you when it
        is live.
      </p>
      <WaitlistForm action={joinWaitlist} />
    </>
  );
}
