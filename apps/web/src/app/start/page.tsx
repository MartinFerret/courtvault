import type { Metadata } from 'next';
import { Pitch, PassThroughCta } from '@/components/landing';

// Link-in-bio landing (TikTok, Instagram): one promise, one action, out of the index (R55).
export const metadata: Metadata = {
  title: 'Your cards, scored every morning',
  description:
    'Basketball card values by parallel and grade, and what last night did to your collection. Free.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/start' },
};

export default function StartPage() {
  return (
    <section className="landing" data-landing>
      <h1 className="landing__title">Your basketball cards, scored every morning.</h1>
      <p className="landing__lead">
        Add your cards, see what each one is worth, and wake up to what last night&apos;s games did
        to your collection.
      </p>
      <PassThroughCta campaign="start" label="Start free" />
      <p className="landing__note">Free, in your browser. No card number, no password.</p>
      <Pitch />
    </section>
  );
}
