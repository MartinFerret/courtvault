import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/** Breakpoints shared with tokens.scss: tablet from 768px, desktop (sidebar) from 1024px. */
export const DESKTOP_QUERY = '(min-width: 1024px)';
export const TABLET_QUERY = '(min-width: 768px)';

/**
 * Where the app runs and how wide it is. Templates switch between the phone layout and the
 * desktop layout (sidebar, data table, two columns) on these signals; services never do.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly isNative = Capacitor.isNativePlatform();
  readonly isDesktop = signal(false);
  readonly isTablet = signal(false);

  constructor() {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const tablet = window.matchMedia(TABLET_QUERY);
    this.isDesktop.set(desktop.matches);
    this.isTablet.set(tablet.matches);
    desktop.addEventListener('change', (e) => this.isDesktop.set(e.matches));
    tablet.addEventListener('change', (e) => this.isTablet.set(e.matches));
  }
}
