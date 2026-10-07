import {
  AFFILIATION_DISCLAIMER,
  APP_SCHEME as SHARED_APP_SCHEME,
  BRAND_NAME,
} from '@courtvault/shared';

export const SITE_NAME = BRAND_NAME;
export const SITE_TAGLINE = 'Basketball card values by parallel and grade';
/**
 * Homepage commercial keyword (R5, R24). Provisional until the Keyword Planner volumes are in:
 * "basketball card collection tracker" has the most accessible top 3 (docs/keyword-map.md).
 * A title change costs nothing; the URL (/) never changes.
 */
export const HOME_KEYWORD = 'Basketball card collection tracker';
export const HOME_PROMISE = 'live values';
export const SITE_DESCRIPTION =
  'Basketball card values by parallel and grade from live eBay listings, plus a morning report of what last night’s games did to your cards.';
export const DISCLAIMER = AFFILIATION_DISCLAIMER;

export function siteUrl(): string {
  return (process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export const APPLE_APP_ID = process.env['NEXT_PUBLIC_APPLE_APP_ID'] ?? '';
/** Deep link scheme handled by the app (Universal Links / App Links use the same paths). */
export const APP_SCHEME = SHARED_APP_SCHEME;

/** Robots meta from the quality gate (page_index_status): index when the page carries data. */
export function robotsFor(indexable: boolean): { robots: { index: boolean; follow: boolean } } {
  return { robots: { index: indexable, follow: true } };
}

/** Pages with no value of their own for search (R55): never indexed, never in the sitemap. */
export const NOINDEX_ROBOTS = { robots: { index: false, follow: true } } as const;

/** Title format of R27: `[Keyword]: [promise] | Brand`, about 60 characters. Long keywords skip the promise. */
export function seoTitle(keyword: string, promise: string): string {
  return promise ? `${keyword}: ${promise}` : keyword;
}
