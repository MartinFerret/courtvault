import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal,
  IonNote, IonTitle, IonToolbar,
} from '@ionic/angular';
import { PREMIUM_PRICING } from '@courtvault/shared';
import { BillingService, type Offering } from '../../core/billing/billing.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { PlanService } from '../../core/plan/plan.service';

const REASONS: Record<string, string> = {
  cards: 'You reached the free limit of cards in your Vault.',
  followed_players: 'You reached the free limit of followed players.',
  price_alerts: 'You reached the free limit of price alerts.',
  checklist_follows: 'You reached the free limit of followed checklists.',
  photos: 'You reached the free limit of card photos.',
  export: 'CSV export is a Premium feature.',
  history: 'Full price history is a Premium feature.',
};

/** Global paywall modal, opened by PaywallService (from LIMIT_REACHED errors or the profile). */
@Component({
  selector: 'cv-paywall',
  imports: [IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem, IonLabel, IonNote, IonIcon],
  templateUrl: './paywall.component.html',
})
export class PaywallComponent {
  readonly paywall = inject(PaywallService);
  readonly billing = inject(BillingService);
  readonly plan = inject(PlanService);
  private readonly router = inject(Router);
  readonly pricing = PREMIUM_PRICING;
  readonly message = signal<string | null>(null);

  readonly benefits = [
    'Unlimited cards in your Vault',
    'Unlimited players in "Last night"',
    'Unlimited price alerts and checklists',
    'Full price history',
    'Gains and losses, CSV export',
  ];

  reasonText(): string {
    const key = this.paywall.reason();
    return (key && REASONS[key]) || 'Go Premium to unlock everything.';
  }

  async buy(offering: Offering): Promise<void> {
    this.message.set(null);
    try {
      const active = await this.billing.purchase(offering);
      this.message.set(active ? 'Welcome to Premium!' : 'Purchase pending. Your plan updates in a moment.');
      if (active) setTimeout(() => this.paywall.close(), 1200);
    } catch (err) {
      this.message.set(err instanceof Error ? err.message : 'Purchase failed.');
    }
  }

  async restore(): Promise<void> {
    this.message.set(null);
    try {
      const active = await this.billing.restore();
      this.message.set(active ? 'Premium restored.' : 'No active subscription found.');
    } catch (err) {
      this.message.set(err instanceof Error ? err.message : 'Restore failed.');
    }
  }

  openLegal(page: string): void {
    this.paywall.close();
    void this.router.navigate(['/legal', page]);
  }
}
