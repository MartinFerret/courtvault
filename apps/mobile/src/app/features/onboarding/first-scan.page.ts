import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';

@Component({
  selector: 'cv-first-scan',
  imports: [IonContent, IonButton, IonIcon],
  template: `
    <ion-content class="ion-padding">
      <div class="cv-onboarding">
        <ion-icon name="scan-outline" class="cv-hero-icon"></ion-icon>
        <h1>Scan your first card</h1>
        <p class="cv-muted">Point the camera at the back of a card. We read the number, season and player, you pick the parallel. Done in seconds.</p>
        <ion-button expand="block" (click)="go('/tabs/scan')">Scan a card</ion-button>
        <ion-button expand="block" fill="clear" (click)="go('/tabs/last-night')">Later</ion-button>
      </div>
    </ion-content>
  `,
})
export class FirstScanPage {
  private readonly router = inject(Router);
  go(path: string): void {
    void this.router.navigateByUrl(path);
  }
}
