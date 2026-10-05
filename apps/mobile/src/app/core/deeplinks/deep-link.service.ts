import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

/**
 * Universal Links (iOS), App Links (Android) and the courtvault:// scheme share the website's
 * paths: /cards/:slug, /players/:slug, /sets/:slug, /rankings/rookies.
 * Native config (apple-app-site-association, assetlinks.json) is documented in the README.
 */
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private readonly router = inject(Router);

  init(): void {
    if (!Capacitor.isNativePlatform()) return;
    void App.addListener('appUrlOpen', ({ url }) => {
      const path = this.toRoute(url);
      if (path) void this.router.navigateByUrl(path);
    });
  }

  /** Maps a website or scheme URL to an in-app route. Exported for tests. */
  toRoute(url: string): string | null {
    let path: string;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'courtvault:') {
        path = `/${parsed.host}${parsed.pathname}`;
      } else if (parsed.origin === environment.webUrl || parsed.hostname.endsWith('courtvault.app')) {
        path = parsed.pathname;
      } else {
        return null;
      }
    } catch {
      return null;
    }
    if (/^\/(cards|players|sets)\/[a-z0-9-]+$/.test(path)) return path;
    if (path === '/rankings/rookies') return '/tabs/sets';
    if (path === '/last-night') return '/tabs/last-night';
    if (path.startsWith('/card/')) return `/card/${path.slice(6)}`;
    if (path.startsWith('/auth/callback')) return '/tabs/last-night';
    return null;
  }
}
