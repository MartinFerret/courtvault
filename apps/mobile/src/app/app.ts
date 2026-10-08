import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { IonApp, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/angular';
import { PaywallComponent } from './features/paywall/paywall.component';
import { SidebarComponent } from './features/shell/sidebar.component';
import { AuthService } from './core/auth/auth.service';
import { DeepLinkService } from './core/deeplinks/deep-link.service';
import { LayoutService, DESKTOP_QUERY } from './core/layout/layout.service';
import { ShortcutsService } from './core/layout/shortcuts.service';
import { registerIcons } from './shared/icons';

/**
 * Root shell. On desktop widths the split pane shows the sidebar next to the content; on
 * phones the menu is hidden and pages keep the bottom tab bar. The sidebar is disabled while
 * signed out and on every onboarding step (signed in or not): onboarding is a single column.
 */
@Component({
  selector: 'cv-root',
  imports: [IonApp, IonRouterOutlet, IonSplitPane, IonMenu, PaywallComponent, SidebarComponent],
  template: `
    <ion-app>
      <ion-split-pane contentId="main" [when]="desktopQuery">
        <ion-menu
          contentId="main"
          type="push"
          [disabled]="!auth.isSignedIn() || onboarding()"
          class="cv-menu"
        >
          <cv-sidebar></cv-sidebar>
        </ion-menu>
        <ion-router-outlet id="main"></ion-router-outlet>
      </ion-split-pane>
      <cv-paywall></cv-paywall>
    </ion-app>
  `,
})
export class App {
  readonly auth = inject(AuthService);
  readonly layout = inject(LayoutService);
  private readonly deepLinks = inject(DeepLinkService);
  private readonly shortcuts = inject(ShortcutsService);
  readonly desktopQuery = DESKTOP_QUERY;
  private readonly router = inject(Router);
  /** True on /onboarding and its steps (pick players, first scan). */
  readonly onboarding = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/onboarding')),
    ),
    { initialValue: location.pathname.startsWith('/onboarding') },
  );

  constructor() {
    registerIcons();
    this.deepLinks.init();
    this.shortcuts.init();
  }
}
