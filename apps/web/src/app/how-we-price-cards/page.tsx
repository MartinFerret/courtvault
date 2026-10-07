import Link from 'next/link';
import type { Metadata } from 'next';
import { PRICE_LABEL, formatCents } from '@courtvault/shared';
import { lastNightThresholds } from '@/lib/last-night';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { FreshnessLine } from '@/components/freshness';
import { JsonLd } from '@/components/json-ld';
import { UpdateTimeline } from '@/components/update-timeline';
import { getFreshness } from '@/lib/freshness';
import { PATHS } from '@/lib/paths';
import { SITE_NAME, absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'How we price cards',
  description: `How ${SITE_NAME} values basketball cards: median asking prices from live eBay listings by parallel and grade, refreshed every night at 5:30 AM ET next to the box scores, and what we never claim.`,
  alternates: { canonical: PATHS.method },
};

export default async function MethodPage() {
  const freshness = await getFreshness().catch(() => null);
  const { minSample, minPriceCents } = lastNightThresholds();
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'How we price cards',
          url: absoluteUrl(PATHS.method),
          publisher: { '@id': absoluteUrl('/#organization') },
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
          <a href="#schedule">The nightly cycle</a>
          <a href="#form">The form badge</a>
          <a href="#claims">What we never claim</a>
          <a href="#limits">Limits</a>
        </nav>
        <div className="method__body">
          <p className="lead">
            One number per parallel and grade, from live listings, refreshed every night and shown
            next to how the player played. This page says exactly where each number comes from and
            what it does not mean.
          </p>
          <FreshnessLine data={freshness} />

          <h2 id="source">Where a value comes from</h2>
          <p>
            Every value is the <strong>{PRICE_LABEL.toLowerCase()}</strong> of active eBay listings
            for that exact card, parallel and grade (raw, PSA 9, PSA 10). Asking prices are what
            sellers want today, not what buyers paid: we label them as such everywhere and never
            present them as sold prices. A value is published only when at least {minSample}{' '}
            listings back it and it is above {formatCents(minPriceCents)}; under that, the card
            shows no value rather than a shaky one.
          </p>
          <p>
            Parallels are priced in order of what collectors watch: Base first, then the parallels
            most listed for that set. A card page lists every parallel and print run from the
            official checklist, priced or not.
          </p>

          <h2 id="schedule">The nightly cycle</h2>
          <UpdateTimeline />
          <p>
            Prices change only when the listings change: each night&apos;s update records a new
            point when the median moved, so the history behind a card is made of real changes, not
            daily copies. Public pages refresh within the hour; the app and the morning email read
            the same numbers.
          </p>

          <h2 id="form">The form badge</h2>
          <p>
            A player can carry a <span className="form-badge form-badge--hot">Hot form</span> or{' '}
            <span className="form-badge form-badge--cold">Cold form</span> badge. The rule uses
            stats only, never prices: points + rebounds + assists per game over the last 5 games,
            against the player&apos;s season average (every game we have tracked since September 1
            of the season, preseason included). At least 15% above the average is hot, at least 15%
            below is cold, anything else shows no badge. Nothing is shown before 10 tracked games.
          </p>

          <h2 id="claims">What we never claim</h2>
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

          <h2 id="limits">Limits</h2>
          <ul>
            <li>
              Scope: NBA basketball, Topps sets from 2025-26 on. Checklists come from the official
              Topps files.
            </li>
            <li>
              No card images: the only photos are the ones you take in the app, and they stay
              private.
            </li>
            <li>
              Not affiliated with the NBA, the NBPA or Topps. Set and player names identify cards,
              nothing more.
            </li>
          </ul>
          <p>
            <Link href={PATHS.movers}>See last night&apos;s movers</Link>
          </p>
        </div>
      </div>
    </>
  );
}
