import Link from 'next/link';
import type { Metadata } from 'next';
import { formatEasternDay } from '@courtvault/shared';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { SCORING_UPDATED } from '@/lib/content-dates';
import { fantasyWeights } from '@/lib/data';
import { PATHS } from '@/lib/paths';
import { DISCLAIMER, SITE_NAME, absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  // R27: keyword first, promise, brand suffix from the layout template (58 characters).
  title: 'Fantasy basketball scoring: Vault Score rules',
  description:
    'How Vault Score counts fantasy basketball points per stat, why the captain doubles and when lineups lock. Free to play, badges only.',
  alternates: { canonical: PATHS.scoring },
};

const LABELS: Record<string, string> = {
  points: 'Point',
  rebounds: 'Rebound',
  assists: 'Assist',
  steals: 'Steal',
  blocks: 'Block',
  turnovers: 'Turnover',
};

const DEFAULT_WEIGHTS = [
  { stat: 'points', weight: 1 },
  { stat: 'rebounds', weight: 1.2 },
  { stat: 'assists', weight: 1.5 },
  { stat: 'steals', weight: 3 },
  { stat: 'blocks', weight: 3 },
  { stat: 'turnovers', weight: -1 },
];

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export default async function ScoringPage() {
  const weights = await fantasyWeights().catch(() => DEFAULT_WEIGHTS);
  const w = Object.fromEntries(
    (weights.length ? weights : DEFAULT_WEIGHTS).map((x) => [x.stat, x.weight]),
  );
  const example = { points: 25, rebounds: 8, assists: 6, steals: 2, blocks: 1, turnovers: 3 };
  const parts = Object.entries(example).map(([stat, n]) => ({
    stat,
    n,
    pts: Math.round(n * (w[stat] ?? 0) * 10) / 10,
  }));
  const total = Math.round(parts.reduce((s, p) => s + p.pts, 0) * 10) / 10;

  const faq = [
    {
      q: 'How are fantasy basketball points counted in Vault Score?',
      a: `Each player in your lineup scores from his real box score: ${weights
        .map((x) => `${signed(x.weight)} per ${LABELS[x.stat]?.toLowerCase() ?? x.stat}`)
        .join(', ')}. Your captain's points count double.`,
    },
    {
      q: 'When does my lineup lock?',
      a: 'At the first tip-off of the day, US Eastern time. Changes made after the lock count from the next game day.',
    },
    {
      q: 'What if a player does not play?',
      a: 'He scores 0 for the night. There are no automatic substitutions.',
    },
    {
      q: 'Can I win money or cards?',
      a: `No. ${SITE_NAME} Vault Score is free: no entry fee, no cash, no cards and no gift prizes. Rewards are badges only.`,
    },
    {
      q: 'Does a rare card score more?',
      a: 'No. You field players you own a card of, and any card counts. Card value, rarity and a Premium plan never change a point.',
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              name: 'Fantasy basketball scoring',
              url: absoluteUrl(PATHS.scoring),
              dateModified: SCORING_UPDATED,
              publisher: { '@id': absoluteUrl('/#organization') },
            },
            {
              '@type': 'FAQPage',
              mainEntity: faq.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ],
        }}
      />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Fantasy basketball scoring', href: PATHS.scoring },
        ]}
      />
      <h1>Fantasy basketball scoring</h1>
      <div className="method">
        <nav className="method__nav" aria-label="On this page">
          <a href="#points">Points per stat</a>
          <a href="#lineup">Lineup and captain</a>
          <a href="#lock">The lock</a>
          <a href="#rankings">Rankings and leagues</a>
          <a href="#fair-play">Fair play</a>
          <a href="#faq">Common questions</a>
        </nav>
        <div className="method__body">
          <p className="lead">
            Vault Score is the free daily game of {SITE_NAME}: pick five players you own a card of,
            name a captain, and score from their real box scores. Card value and rarity never count,
            only what happens on the floor.
          </p>
          <p className="muted small">Last updated {formatEasternDay(SCORING_UPDATED)}.</p>

          <h2 id="points">How many points is each stat worth?</h2>
          <table className="scoring-table">
            <caption className="sr-only">Fantasy points per box score stat</caption>
            <thead>
              <tr>
                <th scope="col">Stat</th>
                <th scope="col">Fantasy points</th>
              </tr>
            </thead>
            <tbody>
              {weights.map((x) => (
                <tr key={x.stat}>
                  <th scope="row">{LABELS[x.stat] ?? x.stat}</th>
                  <td className={x.weight < 0 ? 'scoring-table__neg' : undefined}>
                    {signed(x.weight)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Example: a line of {example.points} points, {example.rebounds} rebounds,{' '}
            {example.assists} assists, {example.steals} steals, {example.blocks} block and{' '}
            {example.turnovers} turnovers makes{' '}
            {parts
              .map((p) => (p.pts < 0 ? `- ${-p.pts}` : `${p.pts}`))
              .join(' + ')
              .replace(/\+ -/g, '-')}{' '}
            = <strong>{total}</strong> fantasy points. As captain,{' '}
            <strong>{Math.round(total * 20) / 10}</strong>.
          </p>

          <h2 id="lineup">How do the lineup and the captain work?</h2>
          <ul>
            <li>Five players, one spot each, from the players you own at least one card of.</li>
            <li>One captain: his points count double.</li>
            <li>
              A card added today counts from tomorrow, so nobody adds a star five minutes before
              tip-off.
            </li>
            <li>Your lineup carries over from day to day until you change it.</li>
          </ul>

          <h2 id="lock">When does the lineup lock?</h2>
          <p>
            At the first tip-off of the day, US Eastern time. After the lock, tonight&apos;s lineup
            is frozen and any change counts from the next game day. A player who does not play
            scores 0; there are no automatic substitutions. Scores arrive the next morning with the
            box scores.
          </p>

          <h2 id="rankings">How do rankings and leagues work?</h2>
          <ul>
            <li>
              Weeks run Monday to Sunday. The season follows the regular season; preseason, play-in
              and playoff nights do not count.
            </li>
            <li>
              The global ranking shows a username only, never an email, and anyone can leave it.
            </li>
            <li>
              Private leagues let friends play with the same rules; members count from the day they
              join.
            </li>
          </ul>

          <h2 id="fair-play">Is there anything to win?</h2>
          <p>
            Badges only: weekly winner, perfect captain, 200 club, iron five. Vault Score is free,
            with no entry fee, no cash, no cards and no gift prizes. Collections are self-declared,
            which is why rarity and value never affect a score, and Premium adds leagues and
            history, never points.
          </p>

          <h2 id="faq">Common questions</h2>
          {faq.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}

          <p>
            Values and box scores come from the same nights; see{' '}
            <Link href={PATHS.method}>how we price cards</Link>.
          </p>
          <p className="muted small">
            {DISCLAIMER} Player names and statistics are factual information. Vault Score is not
            endorsed by any league, team or players association.
          </p>
        </div>
      </div>
    </>
  );
}
