import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  BRAND_DIFFERENTIATOR,
  BRAND_TAGLINE,
  GRADE_LABELS,
  PRICING,
  formatParallel,
  formatUsd,
} from '@courtvault/shared';
import { AppCta } from '@/components/app-cta';
import { foilProps } from '@/components/foil';
import { JsonLd } from '@/components/json-ld';
import { Delta, Price, PriceNote } from '@/components/price';
import { listSets, rookieRankings } from '@/lib/data';
import { getLastNight } from '@/lib/last-night';
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
    text: 'Search the catalog by player, set or number, scan on your phone, or import the spreadsheet you already keep.',
  },
  {
    title: 'See what they are worth',
    text: 'Every parallel and print run, Raw, PSA 9 and PSA 10, with the price history behind each number.',
  },
  {
    title: 'Wake up to the box score',
    text: 'Each morning: how your players played and what the night did to the value of your cards.',
  },
];

const NOT_DOING = [
  'NBA basketball only, starting with the 2025-26 Topps sets.',
  'Asking prices from live listings, labeled as such. No sold-price promises.',
  'No marketplace, no trading between users.',
  'No official card images: the only photos are the ones you take, and they stay private.',
];

export default async function HomePage() {
  const [rookies, sets, night] = await Promise.all([
    rookieRankings(6),
    listSets(),
    getLastNight().catch(() => null),
  ]);
  const cardCount = sets.reduce((n, s) => n + s.card_count, 0);
  const movers = night ? [...night.gainers.slice(0, 3), ...night.losers.slice(0, 2)] : [];
  const heroCards = rookies.slice(0, 3);

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
            <Link className="button" href="/waitlist">
              Join the waitlist
            </Link>
            <Link className="button secondary" href="/last-night">
              See last night&apos;s movers
            </Link>
          </div>
          <p className="hero__meta">
            {cardCount.toLocaleString('en-US')} cards from {sets.length} Topps sets, priced every
            night. Free, Premium at {formatUsd(PRICING.monthlyUsd)}/month or{' '}
            {formatUsd(PRICING.yearlyUsd)}/year.
          </p>
        </div>
        <ul
          className="hero__tiles"
          aria-label="Trending rookie cards and their current asking prices"
        >
          {heroCards.slice(0, 2).map((r, i) => {
            const foil = foilProps(i === 0 ? 'Refractor' : 'Base', null);
            return (
              <li key={r.card_id} className={`vault-tile ${foil.className}`} style={foil.style}>
                <Link href={`/cards/${r.card_slug}`} className="vault-tile__link">
                  <span className="vault-tile__name">
                    #{r.card_number} {r.player_name} <span className="badge">RC</span>
                  </span>
                  <span className="muted small">
                    {r.season} {r.set_name}
                  </span>
                  <span className="vault-tile__price">
                    <Price cents={r.price_cents} />
                  </span>
                  <span className="small">
                    <Delta cents={r.change_7d_cents} /> <span className="muted">7 days</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <span className="hero__word" aria-hidden="true">
          Hoop
          <br />
          Ticker
        </span>
      </section>

      {movers.length > 0 && night?.day ? (
        <section className="section">
          <div className="section__head">
            <h2>What last night did to the market</h2>
            <Link href="/last-night">All movers and box scores</Link>
          </div>
          <ul className="movers">
            {movers.map((m) => {
              const foil = foilProps(m.parallel_name, m.serial_run);
              return (
                <li
                  key={`${m.card_slug}-${m.parallel_name}-${m.grade}`}
                  className={`mover ${foil.className}`}
                  style={foil.style}
                >
                  <Link href={`/cards/${m.card_slug}`} className="mover__link">
                    <span className="mover__delta">
                      <Delta cents={m.change_cents} />
                      <span className={m.change_cents >= 0 ? 'gain' : 'loss'}>
                        {' '}
                        {m.change_pct > 0 ? '+' : ''}
                        {m.change_pct}%
                      </span>
                    </span>
                    <span className="mover__name">
                      #{m.card_number} {m.player_name}
                    </span>
                    <span className="muted small">
                      {formatParallel(m.parallel_name, m.serial_run)} · {GRADE_LABELS[m.grade]}
                    </span>
                    {m.line ? (
                      <span className="small">
                        {m.line.points} pts · {m.line.rebounds} reb · {m.line.assists} ast
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <h2>How it works</h2>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="step">
              <span className="step__n" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{step.title}</h3>
              <p className="muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Trending rookies</h2>
          <Link href="/rankings/rookies">Full rookie rankings</Link>
        </div>
        <PriceNote />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Card</th>
                <th>Set</th>
                <th className="num">Base, raw</th>
                <th className="num">7 days</th>
              </tr>
            </thead>
            <tbody>
              {rookies.map((r) => (
                <tr key={r.card_id}>
                  <td>
                    <Link href={`/cards/${r.card_slug}`}>
                      #{r.card_number} {r.player_name}
                    </Link>{' '}
                    <span className="badge">RC</span>
                  </td>
                  <td>
                    <Link href={`/sets/${r.set_slug}`}>
                      {r.season} {r.set_name}
                    </Link>
                  </td>
                  <td className="num">
                    <Price cents={r.price_cents} />
                  </td>
                  <td className="num">
                    <Delta cents={r.change_7d_cents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section section--split">
        <div>
          <h2>Checklists</h2>
          <div className="grid">
            {sets.map((s) => (
              <Link key={s.id} href={`/sets/${s.slug}`} className="card">
                <strong>
                  {s.season} {s.name}
                </strong>
                <span className="muted small">
                  {s.card_count} cards{s.release_date ? ` · released ${s.release_date}` : ''}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="plain">
          <h2>What we do not do</h2>
          <ul className="plain__list">
            {NOT_DOING.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <AppCta />
    </>
  );
}
