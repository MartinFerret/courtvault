import type { NextConfig } from 'next';

// PostHog ingestion region (EU project). The website proxies /ingest to it so first-party
// requests survive ad blockers; robots.txt disallows /ingest/.
const POSTHOG_HOST = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://eu.i.posthog.com';
const POSTHOG_ASSETS = POSTHOG_HOST.replace('.i.posthog.com', '-assets.i.posthog.com');

const nextConfig: NextConfig = {
  transpilePackages: ['@courtvault/shared'],
  // PostHog SDK requests end without a trailing slash; the default redirect would break them.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Universal Links and App Links association files (404 until the store keys exist).
      { source: '/.well-known/apple-app-site-association', destination: '/api/app-links/apple' },
      { source: '/.well-known/assetlinks.json', destination: '/api/app-links/android' },
      { source: '/ingest/static/:path*', destination: `${POSTHOG_ASSETS}/static/:path*` },
      { source: '/ingest/:path*', destination: `${POSTHOG_HOST}/:path*` },
    ];
  },
  // Next 16 writes AGENTS.md / CLAUDE.md into the app folder on dev start; the repo has its own.
  agentRules: false,
  // Static assets get long cache headers; HTML pages are cached by Netlify's ISR layer.
  async headers() {
    return [
      {
        // HSTS (audit 4.11): the apex and www already redirect to https with one hop.
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      {
        source: '/:all*(svg|png|jpg|jpeg|webp|ico|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
