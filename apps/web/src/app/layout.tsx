import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/outfit';
import './globals.css';
import { Analytics } from '@/components/analytics';
import { Attribution } from '@/components/attribution';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { APPLE_APP_ID, SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE_NAME,
    // R27/R28: `[Keyword]: [promise] | HoopTicker`, short brand suffix on every page.
    template: `%s | ${SITE_NAME}`,
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
  themeColor: '#121417',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Analytics />
        <Attribution />
        <SiteHeader />
        <main id="main" className="container">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
