import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { AppCta } from '@/components/app-cta';
import { ActionCta } from '@/components/session-cta';
import { appLink } from '@/lib/app-link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { CardVisual } from '@/components/card-visual';
import { ImageCredit } from '@/components/image-credit';
import { SetVisual } from '@/components/set-visual';
import { SetGallery } from '@/components/set-gallery';
import { ListFilter } from '@/components/list-filter';
import { Price, PriceNote } from '@/components/price';
import { getRelease, getSet, indexStatus, listSets, topRookiesOfSet } from '@/lib/data';
import { UpcomingChecklist } from '@/components/upcoming-checklist';
import { cardImage } from '@/lib/images';
import { PATHS, cardPath, checklistPath, playerPath } from '@/lib/paths';
import { absoluteUrl, robotsFor, seoTitle } from '@/lib/site';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const sets = await listSets();
    return sets.map((s) => ({ slug: s.public_slug }));
  } catch (err) {
    console.warn(`generateStaticParams skipped: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/** "Feb 11, 2026" for the fact strip. */
function releaseLabel(day: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`));
}

/** Keyword of the page: "<season> <set> basketball checklist" (docs/keyword-map.csv). */
function keyword(set: { season: string; name: string }): string {
  // "Topps Basketball" already carries the word; "Topps Chrome" needs it.
  return `${set.season} ${set.name}${/basketball/i.test(set.name) ? '' : ' Basketball'} Checklist`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const set = await getSet(slug);
  if (!set) {
    // Announced set (audit item 7): the final URL answers before the import, noindex until then.
    const release = await getRelease(slug).catch(() => null);
    if (release) {
      return {
        robots: { index: false, follow: true },
        title: seoTitle(keyword(release), 'coming soon'),
        description: `${release.season} ${release.name} basketball checklist: the full card list, rookie cards and parallels with print runs, published here the day Topps releases it.`,
        alternates: { canonical: checklistPath(release.public_slug) },
      };
    }
    return { title: 'Checklist not found' };
  }
  const status = await indexStatus('checklist', set.public_slug ?? set.slug);
  const rookies = set.cards.filter((c) => c.is_rookie).length;
  return {
    ...robotsFor(status.indexable),
    title: seoTitle(keyword(set), `${set.cards.length} cards`),
    description: `Full ${set.season} ${set.name}${/basketball/i.test(set.name) ? '' : ' basketball'} checklist: ${set.cards.length} cards, ${rookies} rookie cards, every parallel with its print run and market values by grade.`,
    alternates: { canonical: checklistPath(set.public_slug ?? set.slug) },
    openGraph: { title: keyword(set), type: 'website' },
  };
}

export default async function ChecklistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const set = await getSet(slug);
  if (!set) {
    const release = await getRelease(slug).catch(() => null);
    if (release) return <UpcomingChecklist release={release} />;
    notFound();
  }
  // Old or internal slug: one canonical URL per page (R22).
  if (set.public_slug !== slug) permanentRedirect(checklistPath(set.public_slug));
  const rookies = set.cards.filter((c) => c.is_rookie);
  const priced = set.cards.filter((c) => c.base_cents !== null);
  const top = [...priced].sort((a, b) => (b.base_cents ?? 0) - (a.base_cents ?? 0))[0];
  const name = `${set.season} ${set.name}`;
  const topRookies = await topRookiesOfSet(set.id).catch(() => []);
  const thumbs = set.cards.some((c) => cardImage(c.public_slug));
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: keyword(set),
          numberOfItems: set.cards.length,
          itemListElement: set.cards.slice(0, 50).map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `#${c.number} ${c.player?.name ?? ''}`,
            url: absoluteUrl(cardPath(c.public_slug)),
          })),
        }}
      />
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Checklists', href: PATHS.checklists },
          { name, href: checklistPath(set.public_slug ?? set.slug) },
        ]}
      />
      <header className="shero">
        <div className="shero__visual">
          <SetVisual
            setSlug={set.slug}
            name={set.name}
            season={set.season}
            cardCount={set.cards.length}
            priority
          />
        </div>
        <div className="shero__copy">
          <h1>
            {name}
            {/basketball/i.test(set.name) ? '' : ' basketball'} checklist
          </h1>
          <dl className="facts">
            <div>
              <dd>{set.cards.length}</dd>
              <dt>base cards</dt>
            </div>
            <div>
              <dd>{rookies.length}</dd>
              <dt>rookie cards</dt>
            </div>
            {set.release_date ? (
              <div>
                <dd className="facts__date">{releaseLabel(set.release_date)}</dd>
                <dt>released</dt>
              </div>
            ) : null}
            {priced.length > 0 ? (
              <div>
                <dd>{priced.length}</dd>
                <dt>cards with a value</dt>
              </div>
            ) : null}
          </dl>
          <p className="hero-actions">
            <ActionCta
              href={appLink(`/sets/${set.public_slug ?? set.slug}`, {
                campaign: 'checklist',
                action: 'follow',
              })}
              label="Follow this set"
              attr="cta-checklist-follow"
            />
          </p>
          <p className="lead">
            {name} has {set.cards.length} base cards
            {rookies.length > 0 ? `, ${rookies.length} of them rookie cards` : ''}
            {set.release_date ? `, released ${set.release_date}` : ''}.
            {top && top.base_cents !== null ? (
              <>
                {' '}
                {priced.length} cards have a current market value for the Base parallel, raw; the
                highest is #{top.number} {top.player?.name} at <Price cents={top.base_cents} />.
              </>
            ) : null}{' '}
            Every parallel and print run is listed on each card page.
          </p>
        </div>
      </header>
      {priced.length > 0 ? <PriceNote /> : null}
      <ListFilter
        target="checklist"
        label="Filter cards"
        placeholder="Filter by player, team or number"
        total={set.cards.length}
        noun="cards"
        toggle={{ label: 'Rookies only', attr: 'data-rookie' }}
      />
      <div className="table-wrap">
        <table id="checklist" className="table--striped">
          <thead>
            <tr>
              <th>#</th>
              {thumbs ? <th className="th-visual" aria-label="Card"></th> : null}
              <th>Player</th>
              <th>Team</th>
              {priced.length > 0 ? <th className="num">Base, raw</th> : null}
            </tr>
          </thead>
          <tbody>
            {set.cards.map((c) => (
              <tr
                key={c.id}
                data-filter={`${c.number} ${c.player?.name ?? ''} ${c.player?.team ?? ''}`.toLowerCase()}
                data-rookie={c.is_rookie ? '' : undefined}
              >
                <td className="mono">{c.number}</td>
                {thumbs ? (
                  <td className="td-visual">
                    {cardImage(c.public_slug) ? (
                      <CardVisual
                        publicSlug={c.public_slug}
                        name={`${name} ${c.player?.name ?? ''} ${c.is_rookie ? 'rookie card' : 'card'} #${c.number}`}
                        number={c.number}
                        isRookie={c.is_rookie}
                        size="thumb"
                      />
                    ) : null}
                  </td>
                ) : null}
                <td>
                  <Link href={cardPath(c.public_slug)}>{c.player?.name}</Link>{' '}
                  {c.is_rookie ? <span className="badge">RC</span> : null}
                  {c.player ? (
                    <>
                      {' '}
                      <Link href={playerPath(c.player.public_slug)} className="muted small">
                        all cards
                      </Link>
                    </>
                  ) : null}
                </td>
                <td className="muted">{c.player?.team ?? '–'}</td>
                {priced.length > 0 ? (
                  <td className="num">
                    <Price cents={c.base_cents} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {topRookies.length > 0 ? (
        <>
          <h2>Top rookies of this set</h2>
          <ul className="related">
            {topRookies.map((c) => (
              <li key={c.id}>
                <Link href={cardPath(c.public_slug ?? c.slug)} className="related__item">
                  <CardVisual
                    publicSlug={c.public_slug ?? c.slug}
                    name={`${name} ${c.player?.name ?? ''} rookie card #${c.number}`}
                    number={c.number}
                    isRookie
                    size="thumb"
                  />
                  <span>
                    {c.player?.name} #{c.number}
                    <span className="muted small">
                      {c.base_cents !== null ? <Price cents={c.base_cents} /> : c.player?.team}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <SetGallery setSlug={set.slug} setName={name} />
      <ImageCredit />
      <p className="muted small">
        Track your {name} cards with the <Link href="/">basketball card collection tracker</Link>.
      </p>

      <AppCta context={`your ${name} cards`} />
    </>
  );
}
