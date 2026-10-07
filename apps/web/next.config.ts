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
        source: '/:all*(svg|png|jpg|jpeg|webp|ico|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
