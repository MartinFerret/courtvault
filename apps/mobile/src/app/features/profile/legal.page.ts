import { Component, computed, input } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AFFILIATION_DISCLAIMER, LEGAL_ENTITY, PRICE_SOURCE_NAME } from '@courtvault/shared';

const OPERATOR = `Operated by ${LEGAL_ENTITY.name}, sole trader registered in France (SIREN ${LEGAL_ENTITY.siren}), ${LEGAL_ENTITY.addressLines.join(', ')}. Contact: ${LEGAL_ENTITY.contactEmail}.`;

const PAGES: Record<string, { title: string; paragraphs: string[] }> = {
  terms: {
    title: 'Terms of service',
    paragraphs: [
      'Draft, to be reviewed by counsel before launch.',
      'The app provides a catalog of basketball trading cards and tools to track a personal collection. Values are estimates derived from public listings and are provided for information only.',
      `Values come from eBay sales and listings supplied by ${PRICE_SOURCE_NAME}: the median of recent auction sales when there are enough, the last auction sale otherwise, or the current asking price. Each value says which. They are not appraisals or offers to buy, and a sale can close at another price. Buy links may be affiliate links.`,
      'Price data is licensed to us for display in this app and on our website. You may use it for your personal collection only. You may not scrape, copy, extract, store in bulk, resell or redistribute prices or catalog data, nor access the service by automated means. Accounts that do so may be closed.',
      'Premium subscriptions are purchased through the App Store or Google Play and governed by their terms. Cancel anytime from your store account.',
      'Vault Score is a free game: no entry fee, no cash, no card and no gift prize of any kind. Rewards are badges only. Points come only from real box scores; card value, rarity and Premium never change a score. Collections are self-declared. Rankings show your username, never your email, and you can leave the global ranking. We may correct a score after a box score correction and remove usernames, league names or accounts that abuse the game. Vault Score is not affiliated with or endorsed by the NBA, the NBPA, any team or Topps.',
      OPERATOR,
    ],
  },
  privacy: {
    title: 'Privacy policy',
    paragraphs: [
      'Draft, to be reviewed by counsel before launch.',
      'We store your email, your collection, followed players, price alerts, a push token if you opt in, and the photos you take of your cards. Photos are private thumbnails and are never shown publicly.',
      'Subscriptions are processed by Apple or Google and managed through RevenueCat. We never see your payment details.',
      'You can export your collection (Premium) and delete your account with all its data from the Profile screen.',
      `Data controller: ${LEGAL_ENTITY.name} (SIREN ${LEGAL_ENTITY.siren}), ${LEGAL_ENTITY.addressLines.join(', ')}. Write to ${LEGAL_ENTITY.contactEmail} for any request about your data. Data is stored in the European Union.`,
    ],
  },
  about: {
    title: 'About',
    paragraphs: [
      AFFILIATION_DISCLAIMER,
      'Player names, set names and game statistics are displayed as factual information for identification only.',
      'Card photos are taken by you and stay private.',
      OPERATOR,
    ],
  },
};

@Component({
  selector: 'cv-legal',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"
          ><ion-back-button defaultHref="/tabs/profile"></ion-back-button
        ></ion-buttons>
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
