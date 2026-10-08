import { appleAppSiteAssociation, appleTeamId } from '@/lib/app-links';

// Served at /.well-known/apple-app-site-association (rewrite). Apple fetches it without
// redirects and requires application/json.
export function GET() {
  const teamId = appleTeamId();
  if (!teamId) return new Response('Not found', { status: 404 });
  return Response.json(appleAppSiteAssociation(teamId), {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
