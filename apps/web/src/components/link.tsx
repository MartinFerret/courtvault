import NextLink from 'next/link';
import type { ComponentProps } from 'react';

/**
 * next/link without automatic prefetch. On Netlify every prefetch is its own RSC request (several
 * segments per link, one cache entry per variant, all purged by the daily revalidation), so each
 * page view or crawler render fanned out into server function invocations for pages nobody opened.
 * Visitors mostly land from search and leave for the app; a click still navigates client-side.
 */
export function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
