import { Component, computed, input } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AFFILIATION_DISCLAIMER, PRICE_LABEL } from '@courtvault/shared';

const PAGES: Record<string, { title: string; paragraphs: string[] }> = {
  terms: {
    title: 'Terms of service',
    paragraphs: [
      'Draft, to be reviewed by counsel before launch.',
      'The app provides a catalog of basketball trading cards and tools to track a personal collection. Values are estimates derived from public listings and are provided for information only.',
      `Prices shown are ${PRICE_LABEL.toLowerCase()}s from active eBay listings. They are not sold prices, appraisals or offers to buy. Buy links may be affiliate links.`,
      'Premium subscriptions are purchased through the App Store or Google Play and governed by their terms. Cancel anytime from your store account.',
    ],
  },
  privacy: {
    title: 'Privacy policy',
    paragraphs: [
      'Draft, to be reviewed by counsel before launch.',
      'We store your email, your collection, followed players, price alerts, a push token if you opt in, and the photos you take of your cards. Photos are private thumbnails and are never shown publicly.',
      'Subscriptions are processed by Apple or Google and managed through RevenueCat. We never see your payment details.',
      'You can export your collection (Premium) and delete your account with all its data from the Profile screen.',
    ],
  },
  about: {
    title: 'About',
    paragraphs: [
      AFFILIATION_DISCLAIMER,
      'Player names, set names and game statistics are displayed as factual information for identification only. No official imagery is used.',
      'Card photos are taken by you and stay private.',
    ],
  },
};

@Component({
  selector: 'cv-legal',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile"></ion-back-button></ion-buttons>
        <ion-title>{{ content().title }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @for (p of content().paragraphs; track $index) {
        <p>{{ p }}</p>
      }
    </ion-content>
  `,
})
export class LegalPage {
  readonly page = input.required<string>();
  readonly content = computed(() => PAGES[this.page()] ?? { title: 'Not found', paragraphs: [] });
}
