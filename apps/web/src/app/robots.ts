import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

/** R52: minimal, technical routes blocked, AI crawlers allowed (R105), sitemap declared. */
const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/api/', '/search', '/waitlist', '/ingest/', '/r/', '/u/', '/embed/'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
