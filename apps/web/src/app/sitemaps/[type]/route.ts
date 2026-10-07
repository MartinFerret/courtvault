import { listIndexable } from '@/lib/data';
import { listLastNightDays } from '@/lib/last-night';
import { PATHS, cardPath, checklistPath, moversPath, playerPath } from '@/lib/paths';
import { absoluteUrl } from '@/lib/site';
import { METHOD_UPDATED } from '@/lib/content-dates';

export const revalidate = 3600;

interface Entry {
  loc: string;
  lastmod?: string | null;
}

function xml(entries: Entry[]): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url><loc>${absoluteUrl(e.loc)}</loc>${e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}

/** One urlset per type. Utility pages (legal, waitlist, search) stay out (R49, R55). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
): Promise<Response> {
  const { type } = await params;
  const kind = type.replace(/\.xml$/, '');
  const nights = await listLastNightDays().catch(() => []);
  const latest = nights[0]?.game_day
    ? new Date(`${nights[0].game_day}T13:00:00Z`).toISOString()
    : null;
  switch (kind) {
    case 'pages':
      return xml([
        { loc: '/', lastmod: latest },
        { loc: PATHS.checklists, lastmod: latest },
        { loc: PATHS.players, lastmod: latest },
        { loc: PATHS.rookies, lastmod: latest },
        { loc: PATHS.method, lastmod: METHOD_UPDATED },
      ]);
    case 'checklists':
      return xml(
        (await listIndexable('checklist')).map((p) => ({
          loc: checklistPath(p.slug),
          lastmod: p.lastmod,
        })),
      );
    case 'players':
      return xml(
        (await listIndexable('player')).map((p) => ({
          loc: playerPath(p.slug),
          lastmod: p.lastmod,
        })),
      );
    case 'cards':
      return xml(
        (await listIndexable('card')).map((p) => ({ loc: cardPath(p.slug), lastmod: p.lastmod })),
      );
    case 'movers':
      return xml([
        { loc: moversPath(), lastmod: latest },
        ...nights.map((n) => ({
          loc: moversPath(n.game_day),
          lastmod: new Date(`${n.game_day}T13:00:00Z`).toISOString(),
        })),
      ]);
    default:
      return new Response('Not found', { status: 404 });
  }
}
