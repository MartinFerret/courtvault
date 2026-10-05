import Link from 'next/link';
import type { Metadata } from 'next';
import { AppCta } from '@/components/app-cta';
import { searchCatalog } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

const HREF: Record<string, (slug: string) => string> = {
  player: (slug) => `/players/${slug}`,
  set: (slug) => `/sets/${slug}`,
  card: (slug) => `/cards/${slug}`,
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const query = q.trim().slice(0, 80);
  const results = query ? await searchCatalog(query) : [];
  return (
    <>
      <h1>Search</h1>
      <form className="search-form" action="/search" method="get" role="search">
        <input name="q" type="search" defaultValue={query} aria-label="Search" placeholder="Player, set or card number" />
        <button className="button" type="submit">
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
                <Link href={(HREF[r.kind ?? 'card'] ?? HREF['card']!)(r.slug ?? '')}>{r.title}</Link>{' '}
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
