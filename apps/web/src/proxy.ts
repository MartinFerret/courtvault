import { NextResponse, type NextRequest } from 'next/server';

/**
 * Keeps hosts other than the canonical one (hoopticker.netlify.app, deploy URLs) out of the
 * index: canonical tags already point to NEXT_PUBLIC_SITE_URL, this adds the header. Netlify
 * itself redirects the netlify.app subdomain to the primary custom domain (301) once it is set.
 */
export function proxy(request: NextRequest) {
  const canonical = process.env['NEXT_PUBLIC_SITE_URL'];
  const host = request.headers.get('host')?.split(':')[0];
  if (!canonical || !host) return NextResponse.next();
  const canonicalHost = new URL(canonical).hostname;
  if (host === canonicalHost || canonicalHost === 'localhost') return NextResponse.next();
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  // Pages only: static assets and the image CDN never need the header.
  matcher: ['/((?!_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2|txt|xml)$).*)'],
};
