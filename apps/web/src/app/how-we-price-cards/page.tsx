import Link from 'next/link';
import type { Metadata } from 'next';
import { PRICE_LABEL, formatCents, formatEasternDay } from '@courtvault/shared';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { FreshnessLine } from '@/components/freshness';
import { JsonLd } from '@/components/json-ld';
import { UpdateTimeline } from '@/components/update-timeline';
import { METHOD_UPDATED } from '@/lib/content-dates';
import { getFreshness } from '@/lib/freshness';
import { lastNightThresholds } from '@/lib/last-night';
import { PATHS } from '@/lib/paths';
import { SITE_NAME, absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  // R32: institutional page, brand title, no commercial keyword.
  title: 'How we price cards',
  description:
    'Median asking prices from live eBay listings, by parallel and grade, refreshed every night at 5:30 AM ET next to the box scores. Rules and limits.',
  alternates: { canonical: PATHS.method },
};

export default async function MethodPage() {
  const freshness = await getFreshness().catch(() => null);
  const { minSample, minPriceCents } = lastNightThresholds();
  const minPrice = formatCents(minPriceCents);
  const faq = [
    {
      q: 'What is a median asking price?',
      a: `The middle asking price of the active eBay listings for one exact card, parallel and grade. It is what sellers ask today, not what buyers paid. ${SITE_NAME} never shows sold prices.`,
    },
    {
      q: 'How often are basketball card values updated?',
      a: 'Every night. Box scores arrive at 5:00 AM Eastern, prices refresh at 5:30 AM, and the morning report goes out at 8:00 AM. Public pages follow within the hour.',
    },
    {
      q: 'Is the value what my card will sell for?',
      a: 'No. It is what comparable copies ask right now. A sale can close lower, and a card with few listings shows no value at all.',
    },
    {
      q: 'Why does a card show no value?',
      a: `A value needs at least ${minSample} active listings above ${minPrice}. Under that, the card page lists the parallel and its print run without a number.`,
    },
    {
      q: 'What does the Hot form badge mean?',
      a: 'The player averaged at least 15% more points, rebounds and assists over his last 5 games than over the season. Cold form is the opposite. It uses stats only, never prices, and needs 10 tracked games.',
    },
    {
      q: 'Where do the checklists come from?',
      a: 'From the official Topps checklists, set by set, converted by hand and checked. Each checklist page lists every base card with its number, the rookie cards and every parallel with its print run.',
    },
    {
      q: 'What does a player page show?',
      a: 'The player’s cards in every Topps set with their numbers, the rarest parallels with their print runs, his current team, his game log for the season and, once priced, the median asking price of each card.',
    },
    {
      q: 'Which sets and seasons are covered?',
      a: 'Topps basketball sets from the 2025-26 season onward, and 2026-27 sets as Topps releases them. Older sets and other brands are not in the catalog.',
    },
    {
      q: 'Does a good game raise a card price?',
      a: 'Sometimes, and sometimes not. We show the box score and the asking prices side by side, before tip-off and the next morning, and we never claim that one caused the other.',
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
              name: 'How we price cards',
              url: absoluteUrl(PATHS.method),
              dateModified: METHOD_UPDATED,
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
          { name: 'How we price cards', href: PATHS.method },
        ]}
      />
      <h1>How we price cards</h1>
      <div className="method">
        <nav className="method__nav" aria-label="On this page">
          <a href="#source">Where a value comes from</a>
          <a href="#schedule">When values update</a>
          <a href="#form">The form badge</a>
          <a href="#claims">What we never claim</a>
          <a href="#limits">Limits and what we do not do</a>
          <a href="#faq">Common questions</a>
        </nav>
        <div className="method__body">
          <p className="lead">
            Every basketball card value on {SITE_NAME} is the median asking price of live eBay
            listings for that exact card, parallel and grade, refreshed every night at 5:30 AM
            Eastern and shown next to the box scores of the same night.
          </p>
          <p className="muted small">Last updated {formatEasternDay(METHOD_UPDATED)}.</p>
          <FreshnessLine data={freshness} />

          <h2 id="source">Where does a card value come from?</h2>
          <p>
            From active eBay listings only. The value is the{' '}
            <strong>{PRICE_LABEL.toLowerCase()}</strong> of the listings for one card, one parallel
            and one grade (raw, PSA 9, PSA 10). Asking prices are what sellers want today, not what
            buyers paid: we label them as such everywhere and never present them as sold prices. A
            value is published only when at least {minSample} listings back it and it is above{' '}
            {minPrice}; under that, the card shows no value rather than a shaky one.
          </p>
          <p>
            Parallels are priced in the order collectors watch them: Base first, then the parallels
            most listed for that set. A card page lists every parallel and print run from the
            official Topps checklist, priced or not.
          </p>

          <h2 id="schedule">When are values updated?</h2>
          <p>
            Every night, in three steps in Eastern time: box scores at 5:00 AM, prices at 5:30 AM,
            your report at 8:00 AM.
          </p>
          <UpdateTimeline />
          <p>
            A price point is recorded only when the median moved, so the history behind a card is
            made of real changes, not daily copies. Public pages refresh within the hour; the app
            and the morning email read the same numbers.
          </p>

          <h2 id="form">What does the form badge mean?</h2>
          <p>
            <span className="form-badge form-badge--hot">Hot form</span> means the player averaged
            at least 15% more points, rebounds and assists over his last 5 games than over the
            season. <span className="form-badge form-badge--cold">Cold form</span> means at least
            15% less. The season average covers every game tracked since September 1, preseason
            included. Nothing is shown before 10 tracked games, and the rule uses stats only, never
            prices.
          </p>

          <h2 id="claims">What do we never claim?</h2>
          <ul>
            <li>
              That a game moved a price. We show the box score and the asking prices side by side,
              before tip-off and the next morning. Prices move for many reasons; the wording is
              always &quot;after the game&quot;, never &quot;because of&quot;.
            </li>
            <li>
              That a value is what your card will sell for. It is what comparable copies ask today.
            </li>
            <li>
              A number we do not have. A card without enough listings, a night without games, a
              player without 10 tracked games: the page shows nothing instead of a guess.
            </li>
          </ul>

          <h2 id="limits">What are the limits?</h2>
          <ul>
            <li>
              Scope: NBA basketball, Topps sets from 2025-26 on. Checklists come from the official
              Topps files.
            </li>
            <li>No marketplace and no trading between users: we show listings, we do not sell.</li>
            <li>
              No sold-price promises: asking prices from live listings, labelled as such, nothing
              else.
            </li>
            <li>
              Photos you take in the app stay private; official card images appear on the website
              only, with credit to Topps.
            </li>
            <li>
              Not affiliated with the NBA, the NBPA or Topps. Set and player names identify cards,
              nothing more.
            </li>
          </ul>

          <h2 id="faq">Common questions</h2>
          <dl className="faq">
            {faq.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
          <p>
            <Link href={PATHS.movers}>Trending basketball cards after last night</Link>
          </p>
        </div>
      </div>
    </>
  );
}
