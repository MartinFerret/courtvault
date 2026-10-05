import { AFFILIATION_DISCLAIMER } from '@courtvault/shared';

export const SITE_NAME = 'Courtvault';
export const SITE_TAGLINE = 'Basketball card values by parallel and grade';
export const SITE_DESCRIPTION =
  'Track the value of your basketball trading cards by parallel and grade, and see every morning how last night’s games moved your collection.';
export const DISCLAIMER = AFFILIATION_DISCLAIMER;

export function siteUrl(): string {
  return (process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export const APPLE_APP_ID = process.env['NEXT_PUBLIC_APPLE_APP_ID'] ?? '';
/** Deep link scheme handled by the app (Universal Links / App Links use the same paths). */
export const APP_SCHEME = 'courtvault://';
