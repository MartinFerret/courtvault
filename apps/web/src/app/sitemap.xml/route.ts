import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

/** Sitemap index split by page type (R49). Each child lists only indexable pages with real lastmod. */
export function GET(): Response {
  const types = ['pages', 'checklists', 'players', 'cards', 'movers'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${types.map((t) => `  <sitemap><loc>${absoluteUrl(`/sitemaps/${t}.xml`)}</loc></sitemap>`).join('\n')}
</sitemapindex>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
