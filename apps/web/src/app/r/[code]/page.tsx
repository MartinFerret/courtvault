import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Pitch, PassThroughCta, RememberReferral } from '@/components/landing';
import { getReferrer } from '@/lib/data';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'You are invited to HoopTicker',
  description: 'A friend invites you to track your basketball cards and play Vault Score. Free.',
  robots: { index: false, follow: false },
};

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const referrer = await getReferrer(code).catch(() => null);
  if (!referrer) notFound();
  const who = referrer.username ?? 'A friend';
  return (
    <section className="landing" data-landing>
      <RememberReferral code={code} />
      <p className="landing__kicker">{who} invites you</p>
      <h1 className="landing__title">Track your basketball cards and play with your friends.</h1>
      <Pitch />
      <PassThroughCta campaign="referral" label="Start free" />
      <p className="landing__note">
        Free, in your browser. Your friend sees your username once you join a league together, never
        your email.
      </p>
    </section>
  );
}
