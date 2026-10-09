import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';

@Component({
  selector: 'cv-first-scan',
  imports: [IonContent, IonButton],
  template: `
    <ion-content>
      <div class="cv-hero">
        <div class="cv-hero__art" aria-hidden="true">
          <div class="cv-hero__word">SCAN<br />IT</div>
          <img class="cv-hero__player" src="art-dunk.svg" alt="" />
        </div>
        <h1>Scan your<br />first card.</h1>
        <p class="cv-hero__lead">
          Point the camera at the back of a card. We read the number, season and player. You pick
          the parallel.
        </p>
        <ion-button expand="block" size="large" (click)="go('/tabs/scan')">Scan a card</ion-button>
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
