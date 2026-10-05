import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { PaywallComponent } from './features/paywall/paywall.component';
import { DeepLinkService } from './core/deeplinks/deep-link.service';
import { registerIcons } from './shared/icons';

@Component({
  selector: 'cv-root',
  imports: [IonApp, IonRouterOutlet, PaywallComponent],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
      <cv-paywall></cv-paywall>
    </ion-app>
  `,
})
export class App {
  private readonly deepLinks = inject(DeepLinkService);

  constructor() {
    registerIcons();
    this.deepLinks.init();
  }
}
