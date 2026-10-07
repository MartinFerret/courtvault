import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@courtvault/shared'],
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
