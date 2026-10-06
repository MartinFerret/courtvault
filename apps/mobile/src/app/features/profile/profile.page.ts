import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertController, IonButton, IonContent, IonIcon, IonItem, IonLabel, IonList, IonNote, IonToggle } from '@ionic/angular';
import { AFFILIATION_DISCLAIMER, parseLimitReached } from '@courtvault/shared';
import { AuthService } from '../../core/auth/auth.service';
import { CollectionService } from '../../core/collection/collection.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { PlanService } from '../../core/plan/plan.service';
import { PushService } from '../../core/push/push.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

@Component({
  selector: 'cv-profile',
  imports: [RouterLink, IonContent, IonList, IonItem, IonLabel, IonNote, IonIcon, IonButton, IonToggle],
  templateUrl: './profile.page.html',
})
export class ProfilePage {
  readonly auth = inject(AuthService);
  readonly plan = inject(PlanService);
  readonly push = inject(PushService);
  private readonly collection = inject(CollectionService);
  private readonly paywall = inject(PaywallService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  readonly disclaimer = AFFILIATION_DISCLAIMER;
  readonly message = signal<string | null>(null);

  constructor() {
    void this.plan.load();
  }

  openPaywall(): void {
    void this.paywall.open(null);
  }

  async toggleNotifications(enabled: boolean): Promise<void> {
    if (enabled) await this.push.register();
    else await this.push.disable();
  }

  async exportCsv(): Promise<void> {
    this.message.set(null);
    try {
      const blob = await this.collection.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collection.csv';
      a.click();
      URL.revokeObjectURL(url);
      this.message.set('Export downloaded.');
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.message.set(err instanceof Error ? err.message : 'Export failed.');
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/onboarding');
  }

  async deleteAccount(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Delete your account?',
      message: 'Your collection, follows, alerts and photos will be deleted. This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.supabase
              .invoke('delete-account', {})
              .then(() => this.auth.signOut())
              .then(() => this.router.navigateByUrl('/onboarding'))
              .catch((err: unknown) => this.message.set(err instanceof Error ? err.message : 'Deletion failed.'));
          },
        },
      ],
    });
    await alert.present();
  }
}
