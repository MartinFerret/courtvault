import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BRAND_DIFFERENTIATOR, BRAND_TAGLINE, PRICING, formatUsd } from '@courtvault/shared';
import { CardVisual } from '@/components/card-visual';
import { ImageCredit } from '@/components/image-credit';
import { JsonLd } from '@/components/json-ld';
import { LastNightModule } from '@/components/last-night-module';
import { SetVisual } from '@/components/set-visual';
import { getFreshness } from '@/lib/freshness';
import { setImage } from '@/lib/images';
import {
  cardPublicSlugMap,
  listSets,
  playerPublicSlugMap,
  pricesAvailable,
  rookieRankings,
} from '@/lib/data';
import { getLastNight, pickNotable, previousFeaturedSlug } from '@/lib/last-night';
import { PATHS, cardPath, checklistPath } from '@/lib/paths';
import {
  HOME_KEYWORD,
  HOME_PROMISE,
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  seoTitle,
} from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  // R24/R27: the commercial keyword lives here only. The root page shares the layout's segment,
  // so the layout's title template does not apply to it: the suffix is explicit here.
  title: { absolute: `${seoTitle(HOME_KEYWORD, HOME_PROMISE)} | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

const STEPS = [
  {
    title: 'Add your cards',
    text: 'Search the catalog by player, set or number, scan on your phone, or import your spreadsheet.',
    visual: 'cards',
  },
  {
    title: 'See what they are worth',
    text: 'Every parallel and print run, raw, PSA 9 and PSA 10, with the history behind each number.',
    visual: 'value',
  },
  {
    title: 'Wake up to the box score',
    text: 'Each morning: how your players played and where your cards stand.',
    visual: 'morning',
  },
] as const;

const TIMELINE = [
  ['Final buzzer', 'games end'],
  ['5:00 AM ET', 'box scores'],
  ['5:30 AM ET', 'prices'],
  ['8:00 AM ET', 'your report'],
] as const;

export default async function HomePage() {
  const [ranked, sets, night, slugs, priced, freshness, playerSlugs] = await Promise.all([
    rookieRankings(1),
    listSets(),
    getLastNight().catch(() => null),
    cardPublicSlugMap(),
    pricesAvailable(),
    getFreshness().catch(() => null),
    playerPublicSlugMap(),
  ]);
  const previous = night?.day ? await previousFeaturedSlug(night.day) : null;
  const pick = night ? pickNotable(night.performances, previous) : null;
  const cardCount = sets.reduce((n, s) => n + s.card_count, 0);
  // Hero visual: the top priced rookie when prices exist, the first rookie of the newest set otherwise.
  const heroRookie = ranked[0] ?? null;
  const heroCard = heroRookie
    ? {
        slug: slugs.get(heroRookie.card_slug) ?? heroRookie.card_slug,
        name: `${heroRookie.season} ${heroRookie.set_name} ${heroRookie.player_name} rookie card #${heroRookie.card_number}`,
        number: heroRookie.card_number,
        player: heroRookie.player_name,
        setLabel: `${heroRookie.season} ${heroRookie.set_name}`,
      }
    : null;
  const featuredSets = sets.slice(0, 6);
  // Hero visual: the first set with an official key visual (Topps Chrome today).
  const heroVisual =
    sets
      .map((set) => ({ set, image: setImage(set.slug) }))
      .find(
        (x): x is { set: (typeof sets)[number]; image: NonNullable<ReturnType<typeof setImage>> } =>
          x.image !== null,
      ) ?? null;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': absoluteUrl('/#organization'),
              name: SITE_NAME,
              url: absoluteUrl('/'),
              logo: absoluteUrl('/icon-512.png'),
            },
            {
              '@type': 'WebSite',
              name: SITE_NAME,
              url: absoluteUrl('/'),
              publisher: { '@id': absoluteUrl('/#organization') },
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: absoluteUrl('/search?q={search_term_string}'),
                },
                'query-input': 'required name=search_term_string',
              },
            },
            // R86: product markup on the product page only. Prices from the single source of truth (R69, R85).
            {
              '@type': 'SoftwareApplication',
              name: SITE_NAME,
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'iOS, Android, Web',
              description: SITE_DESCRIPTION,
              url: absoluteUrl('/'),
              offers: [
                { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: PRICING.currency },
                {
                  '@type': 'Offer',
                  name: 'Premium monthly',
                  price: PRICING.monthlyUsd.toFixed(2),
                  priceCurrency: PRICING.currency,
                },
                {
                  '@type': 'Offer',
                  name: 'Premium yearly',
                  price: PRICING.yearlyUsd.toFixed(2),
                  priceCurrency: PRICING.currency,
                },
              ],
            },
          ],
        }}
      />

      <section className="hero">
        <div className="hero__photo" aria-hidden="true">
          <Image
            src="/hero-player.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 860px) 100vw, 60vw"
            className="hero__img"
          />
        </div>
        <div className="hero__copy">
          <h1>{HOME_KEYWORD}</h1>
          <p className="hero__lead">
            {BRAND_TAGLINE} {BRAND_DIFFERENTIATOR}
          </p>
          <div className="hero__actions">
            <Link className="button" href="/waitlist" data-attr="cta-hero">
              Join the waitlist
            </Link>
            <Link className="button secondary" href={PATHS.movers} data-attr="cta-hero-movers">
              See last night&apos;s movers
            </Link>
          </div>
          <p className="hero__meta">
            {cardCount.toLocaleString('en-US')} cards from {sets.length} Topps sets. Free, Premium
            at {formatUsd(PRICING.monthlyUsd)}/month or {formatUsd(PRICING.yearlyUsd)}/year.
          </p>
        </div>
        {heroVisual ? (
          <Link
            href={checklistPath(heroVisual.set.public_slug)}
            className="hero__card hero__card--image"
            aria-label={`${heroVisual.image.caption ?? heroVisual.set.name}, see the ${heroVisual.set.season} ${heroVisual.set.name} checklist`}
          >
            <Image
              src={heroVisual.image.src}
              alt={heroVisual.image.caption ?? `${heroVisual.set.season} ${heroVisual.set.name}`}
              width={300}
              height={Math.round((heroVisual.image.height / heroVisual.image.width) * 300)}
              sizes="300px"
              priority
              className="hero__card-img"
            />
            <span className="hero__card-caption">{heroVisual.image.caption}</span>
          </Link>
        ) : heroCard ? (
          <Link href={cardPath(heroCard.slug)} className="hero__card" aria-label={heroCard.name}>
            <CardVisual
              publicSlug={heroCard.slug}
              name={heroCard.name}
              number={heroCard.number}
              player={heroCard.player}
              setLabel={heroCard.setLabel}
              isRookie
              size="large"
              priority
            />
          </Link>
        ) : null}
      </section>

      {night && night.day && pick ? (
        <LastNightModule
          night={night}
          pick={pick}
          freshness={freshness}
          slugs={{ cards: slugs, players: playerSlugs }}
        />
      ) : null}

      <section className="section">
        <h2>How it works</h2>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="step">
              <span className={`step__visual step__visual--${step.visual}`} aria-hidden="true">
                {step.visual === 'cards' ? (
                  <>
                    <span className="mini-card cv-foil cv-foil--chrome" />
                    <span className="mini-card cv-foil cv-foil--color" />
                    <span className="mini-card" />
                  </>
                ) : step.visual === 'value' ? (
                  <>
                    <span className="mini-tile">
                      <strong>Raw</strong>
                      <span>PSA 9</span>
                      <span>PSA 10</span>
                    </span>
                  </>
                ) : (
                  <span className="mini-morning">
                    <strong>8:00 AM</strong>
                    <span>your report</span>
                  </span>
                )}
              </span>
              <span className="step__n" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{step.title}</h3>
              <p className="muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <ol className="timeline-mini" aria-label="Nightly update schedule, Eastern time">
          {TIMELINE.map(([at, what]) => (
            <li key={at}>
              <strong>{at}</strong> <span className="muted">{what}</span>
            </li>
          ))}
          <li className="timeline-mini__link">
            <Link href={PATHS.method}>How we price cards</Link>
          </li>
        </ol>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Checklists</h2>
          <Link href={PATHS.checklists}>All basketball card checklists</Link>
        </div>
        <ul className="featured-sets">
          {featuredSets.map((s) => (
            <li key={s.id}>
              <Link href={checklistPath(s.public_slug)} className="featured-set">
                <SetVisual
                  setSlug={s.slug}
                  name={s.name}
                  season={s.season}
                  cardCount={s.card_count}
                />
                {setImage(s.slug) ? (
                  <span className="featured-set__label">
                    {s.season} {s.name}
                    <span className="muted small">{s.card_count} cards</span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
        <ImageCredit />
      </section>

      <section className="final-cta">
        <h2>Your collection, every morning</h2>
        <p>
          {priced
            ? 'Values by parallel and grade, refreshed every night, next to the box scores.'
            : 'The whole 2025-26 Topps catalog today; card values start with the regular season.'}
        </p>
        <Link className="button" href="/waitlist" data-attr="cta-block">
          Join the waitlist
        </Link>
      </section>
    </>
  );
}
