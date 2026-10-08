import { androidFingerprints, assetLinks } from '@/lib/app-links';

// Served at /.well-known/assetlinks.json (rewrite). Android verifies it when the app is installed.
export function GET() {
  const fingerprints = androidFingerprints();
  if (fingerprints.length === 0) return new Response('Not found', { status: 404 });
  return Response.json(assetLinks(fingerprints), {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
