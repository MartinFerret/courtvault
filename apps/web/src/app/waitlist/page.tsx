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

const YOU_GET = [
  'Scan a card or search the catalog, every parallel and print run included.',
  'Values by parallel and grade, refreshed every night from live listings.',
  'Every morning, the box score of your players next to where your cards stand.',
];

export default function WaitlistPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Get the app', href: '/waitlist' },
        ]}
      />
      <div className="wl">
        <div className="wl__copy">
          <h1>Get the app</h1>
          <p className="lead">iOS and Android. One email when it is live, nothing else.</p>
          <ul className="wl__list">
            {YOU_GET.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="wl__form">
          <WaitlistForm action={joinWaitlist} />
        </div>
      </div>
    </>
  );
}
