import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pitch, PassThroughCta } from '@/components/landing';
import { getLeagueInvite } from '@/lib/data';
import { PATHS } from '@/lib/paths';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const invite = await getLeagueInvite(code).catch(() => null);
  return {
    title: invite ? `Join ${invite.name} on HoopTicker` : 'League invite',
    description: 'A private Vault Score league: five of your players, real box scores, free.',
    robots: { index: false, follow: false },
  };
}

export default async function LeagueInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await getLeagueInvite(code).catch(() => null);
  if (!invite) notFound();
  return (
    <section className="landing" data-landing>
      <p className="landing__kicker">
        Private league, {invite.members} {invite.members === 1 ? 'member' : 'members'}
      </p>
      <h1 className="landing__title">Join {invite.name}</h1>
      <p className="landing__lead">
        Every night, pick five players you own a card of and a captain. Their real box scores are
        your score. Free, badges only.
      </p>
      <PassThroughCta
        campaign="league-invite"
        label={`Join ${invite.name}`}
        path={`/leagues/join/${invite.code}`}
      />
      <p className="landing__note">
        New to HoopTicker? You sign up first, then you land in the league.{' '}
        <Link href={PATHS.scoring}>How scoring works</Link>.
      </p>
      <Pitch />
    </section>
  );
}
