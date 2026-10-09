import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEasternDay, formatParallel } from '@courtvault/shared';
import { PassThroughCta } from '@/components/landing';
import { Price } from '@/components/price';
import { getShare, type PublicShare } from '@/lib/data';
import { PATHS, cardPath, playerPath } from '@/lib/paths';

// User-made share pages: public by link, never indexed (R55), cached a little.
export const revalidate = 300;

function headline(s: PublicShare): string {
  const p = s.payload;
  if (s.kind === 'lineup') return `${p.username}'s lineup scored ${p.total} pts`;
  if (s.kind === 'league') return `${p.username} is #${p.week_rank ?? '?'} in ${p.league}`;
  return `${p.username}'s best cards`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const share = await getShare(code).catch(() => null);
  if (!share) return { robots: { index: false, follow: false } };
  return {
    title: headline(share),
    description:
      'Shared from HoopTicker: basketball card values and Vault Score, the free daily game.',
    robots: { index: false, follow: true },
  };
}

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const share = await getShare(code).catch(() => null);
  if (!share) notFound();
  const p = share.payload;
  return (
    <section className="landing share">
      <p className="landing__kicker">Shared by {p.username}</p>
      <h1 className="landing__title">{headline(share)}</h1>

      {share.kind === 'lineup' && p.players ? (
        <>
          <p className="landing__lead">
            {p.game_day ? formatEasternDay(p.game_day) : ''}
            {p.counts === false ? ', preseason night' : p.rank ? `, week rank ${p.rank}` : ''}.
          </p>
          <ol className="share__list">
            {p.players.map((pl) => (
              <li key={pl.name}>
                <span>
                  {pl.slug ? <Link href={playerPath(pl.slug)}>{pl.name}</Link> : pl.name}
                  {pl.captain ? <span className="badge share__c">C</span> : null}
                  {!pl.played ? <span className="muted"> did not play</span> : null}
                </span>
                <strong>{pl.fpts} pts</strong>
              </li>
            ))}
          </ol>
          <p className="muted small">
            Points come from real box scores. <Link href={PATHS.scoring}>How scoring works</Link>.
          </p>
        </>
      ) : null}

      {share.kind === 'league' ? (
        <p className="landing__lead">
          {p.members} players in this private league.{' '}
          {p.week_points ? `${p.week_points} pts this week` : ''}
          {p.season_rank ? `, #${p.season_rank} on the season.` : '.'}{' '}
          <Link href={PATHS.scoring}>How Vault Score works</Link>.
        </p>
      ) : null}

      {share.kind === 'vault' && p.cards ? (
        <>
          <p className="landing__lead">
            Top {p.cards.length} of {p.card_count} cards by current value.
          </p>
          <ol className="share__list">
            {p.cards.map((c) => (
              <li key={`${c.card_slug}-${c.parallel}-${c.grade}`}>
                <span>
                  {c.card_slug ? (
                    <Link href={cardPath(c.card_slug)}>
                      {c.season} {c.set} {c.player} #{c.number}
                    </Link>
                  ) : (
                    `${c.season} ${c.set} ${c.player} #${c.number}`
                  )}
                  <span className="muted">
                    {' '}
                    {formatParallel(c.parallel, c.serial_run)},{' '}
                    {c.grade === 'RAW' ? 'raw' : c.grade.replace('PSA', 'PSA ')}
                  </span>
                </span>
                <strong>
                  {c.value_cents !== null ? <Price cents={c.value_cents} /> : 'No value yet'}
                </strong>
              </li>
            ))}
          </ol>
          <p className="muted small">
            Each value is labelled with its source (auction sales or asking prices):{' '}
            <Link href={PATHS.method}>how we price cards</Link>.
          </p>
        </>
      ) : null}

      <div style={{ marginTop: 28 }}>
        <PassThroughCta
          campaign={`share-${share.kind}`}
          label={share.kind === 'vault' ? 'Track your cards' : 'Build your lineup'}
        />
      </div>
      <p className="landing__note">
        <a href={`/share/${share.code}/opengraph-image`} download={`hoopticker-${share.code}.png`}>
          Download the image
        </a>
      </p>
    </section>
  );
}
