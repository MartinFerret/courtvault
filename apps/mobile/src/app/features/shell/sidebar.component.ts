import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular';
import { BRAND_NAME } from '@courtvault/shared';
import { AuthService } from '../../core/auth/auth.service';
import { ShortcutsService } from '../../core/layout/shortcuts.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { PlanService } from '../../core/plan/plan.service';

/** Desktop navigation (split pane). The phone keeps the bottom tab bar. */
@Component({
  selector: 'cv-sidebar',
  imports: [RouterLink, RouterLinkActive, IonButton, IonIcon],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly auth = inject(AuthService);
  readonly plan = inject(PlanService);
  readonly shortcuts = inject(ShortcutsService);
  private readonly paywall = inject(PaywallService);
  readonly brand = BRAND_NAME;

  readonly links = [
    { path: '/tabs/last-night', label: 'Last night', icon: 'sunny-outline' },
    { path: '/tabs/vault', label: 'Vault', icon: 'albums-outline' },
    { path: '/tabs/sets', label: 'Sets', icon: 'card-outline' },
    { path: '/tabs/scan', label: 'Search and add', icon: 'search-outline' },
    { path: '/tabs/profile', label: 'Profile', icon: 'person-circle-outline' },
  ];

  openPaywall(): void {
    void this.paywall.open(null);
  }
}
