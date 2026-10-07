import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { cardPublicSlugMap, playerPublicSlugMap, searchCatalog } from '@/lib/data';
import { cardPath, checklistPath, playerPath } from '@/lib/paths';
import { checklistPublicSlug } from '@courtvault/shared';
import { NOINDEX_ROBOTS } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  ...NOINDEX_ROBOTS,
  title: 'Search',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const query = q.trim().slice(0, 80);
  const results = query ? await searchCatalog(query) : [];
  // search_catalog returns internal slugs; links carry the public ones (R22).
  const [cards, players] = results.length
    ? await Promise.all([cardPublicSlugMap(), playerPublicSlugMap()])
    : [new Map<string, string>(), new Map<string, string>()];
  const href = (kind: string, slug: string) =>
    kind === 'player'
      ? playerPath(players.get(slug) ?? slug)
      : kind === 'set'
        ? checklistPath(checklistPublicSlug(slug))
        : cardPath(cards.get(slug) ?? slug);
  return (
    <>
      <h1>Search</h1>
      <form className="search-form" action="/search" method="get" role="search">
        <input
          name="q"
          type="search"
          defaultValue={query}
          aria-label="Search"
          placeholder="Player, set or card number"
        />
        <button className="button" type="submit" data-attr="search-submit">
          Search
        </button>
      </form>
      {query ? (
        results.length === 0 ? (
          <p className="muted" style={{ marginTop: 16 }}>
            No results for “{query}”.
          </p>
        ) : (
          <ul style={{ marginTop: 16, paddingLeft: 20 }}>
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <Link href={href(r.kind ?? 'card', r.slug ?? '')}>{r.title}</Link>{' '}
                <span className="muted small">
                  {r.kind} · {r.subtitle}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}
      <AppCta />
    </>
  );
}
