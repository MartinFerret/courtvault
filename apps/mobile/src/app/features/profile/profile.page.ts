import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonToggle,
} from '@ionic/angular';
import { AFFILIATION_DISCLAIMER, parseLimitReached } from '@courtvault/shared';
import { AuthService } from '../../core/auth/auth.service';
import { BillingService } from '../../core/billing/billing.service';
import { CollectionService } from '../../core/collection/collection.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { PlanService } from '../../core/plan/plan.service';
import { PushService } from '../../core/push/push.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

import { GameProfileComponent } from '../game/game-profile.component';

@Component({
  selector: 'cv-profile',
  imports: [
    GameProfileComponent,
    RouterLink,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonIcon,
    IonButton,
    IonToggle,
    IonSegment,
    IonSegmentButton,
  ],
  templateUrl: './profile.page.html',
})
export class ProfilePage {
  readonly auth = inject(AuthService);
  readonly plan = inject(PlanService);
  readonly push = inject(PushService);
  readonly billing = inject(BillingService);
  private readonly route = inject(ActivatedRoute);
  private readonly collection = inject(CollectionService);
  private readonly paywall = inject(PaywallService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly sheets = inject(ActionSheetController);
  readonly disclaimer = AFFILIATION_DISCLAIMER;
  readonly message = signal<string | null>(null);

  constructor() {
    void this.plan.load();
    // Back from Stripe Checkout: the webhook grants Premium within seconds; poll a few times.
    const checkout = this.route.snapshot.queryParamMap.get('checkout');
    if (checkout === 'success') {
      this.message.set('Payment received. Your plan updates in a moment…');
      let tries = 0;
      const poll = setInterval(() => {
        void this.plan.load().then(() => {
          if (this.plan.isPremium() || ++tries >= 10) {
            clearInterval(poll);
            this.message.set(
              this.plan.isPremium()
                ? 'Welcome to Premium!'
                : 'Payment received. Premium will appear shortly; refresh if needed.',
            );
          }
        });
      }, 2000);
    } else if (checkout === 'cancel') {
      this.message.set('Checkout cancelled. Nothing was charged.');
    }
  }

  async manageSubscription(): Promise<void> {
    this.message.set(null);
    try {
      await this.billing.openPortal();
    } catch (err) {
      this.message.set(err instanceof Error ? err.message : 'Could not open the billing portal.');
    }
  }

  openPaywall(): void {
    void this.paywall.open(null);
  }

  /**
   * The frequency the user actually receives. The database sends free accounts the weekly
   * digest whatever is stored, so the chips show that rather than a "daily" they never get.
   */
  effectiveDigest(): 'daily' | 'weekly' | 'off' {
    const stored = this.plan.profile()?.digest_frequency ?? 'daily';
    if (stored === 'off') return 'off';
    return this.plan.isPremium() && stored === 'daily' ? 'daily' : 'weekly';
  }

  async setDigest(value: string | number | undefined): Promise<void> {
    if (value === 'daily' && !this.plan.isPremium()) {
      void this.paywall.open('digest');
      return;
    }
    if (value === 'daily' || value === 'weekly' || value === 'off') {
      await this.plan.updateEmailPreferences({ digest_frequency: value });
      this.message.set(
        value === 'off' ? 'Morning email turned off.' : `Morning email set to ${value}.`,
      );
    }
  }

  async setMarketing(enabled: boolean): Promise<void> {
    await this.plan.updateEmailPreferences({ marketing: enabled });
  }

  async toggleNotifications(enabled: boolean): Promise<void> {
    if (enabled) await this.push.register();
    else await this.push.disable();
  }

  /** Profile > Export my collection: basic (free) or full with values (Premium). */
  async chooseExport(): Promise<void> {
    const sheet = await this.sheets.create({
      header: 'Export my collection',
      buttons: [
        { text: 'Basic (cards only)', handler: () => void this.exportCsv('basic') },
        {
          text: this.plan.isPremium() ? 'Full with values' : 'Full with values · Premium',
          handler: () => void this.exportCsv('full'),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async exportCsv(mode: 'basic' | 'full' = 'basic'): Promise<boolean> {
    this.message.set(null);
    try {
      const blob = await this.collection.exportCsv(mode);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collection-${mode}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.message.set(mode === 'full' ? 'Full export downloaded.' : 'Export downloaded.');
      return true;
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.message.set(err instanceof Error ? err.message : 'Export failed.');
      return false;
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/onboarding');
  }

  async deleteAccount(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Delete your account?',
      message:
        'Your collection, follows, alerts and photos will be deleted. This cannot be undone. You can download your data first.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Download my data first',
          handler: () => {
            void this.exportCsv('basic');
            return false; // keep the dialog open
          },
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.supabase
              .invoke('delete-account', {})
              .then(() => this.auth.signOut())
              .then(() => this.router.navigateByUrl('/onboarding'))
              .catch((err: unknown) =>
                this.message.set(err instanceof Error ? err.message : 'Deletion failed.'),
              );
          },
        },
      ],
    });
    await alert.present();
  }
}
