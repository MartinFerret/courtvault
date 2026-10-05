import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * On-demand ISR. Called by job-prices (WEB_REVALIDATE_URL) after prices change, and by the
 * checklist import after a catalog update. Never triggers a redeploy.
 * POST { tags?: string[] } with header x-revalidate-secret.
 */
export async function POST(req: Request) {
  const secret = process.env['REVALIDATE_SECRET'];
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const tags = (body.tags ?? ['prices', 'catalog']).filter((t) => ['prices', 'catalog'].includes(t));
  for (const tag of tags) revalidateTag(tag, 'max');
  return NextResponse.json({ revalidated: tags, at: new Date().toISOString() });
}
