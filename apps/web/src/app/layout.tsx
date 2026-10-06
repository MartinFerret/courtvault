import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { APPLE_APP_ID, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} – ${SITE_TAGLINE}`,
    // Search results show the site name on their own line: no brand suffix in titles.
    template: '%s',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME },
  twitter: { card: 'summary' },
  robots: { index: true, follow: true },
  // iOS smart app banner. Empty until the app is on the App Store.
  ...(APPLE_APP_ID ? { itunes: { appId: APPLE_APP_ID } } : {}),
};

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="container">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
