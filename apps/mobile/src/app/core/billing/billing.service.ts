import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { PRICING } from '@courtvault/shared';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';
import { PlanService } from '../plan/plan.service';

export interface Offering {
  identifier: string;
  title: string;
  priceString: string;
  period: 'monthly' | 'yearly';
  trialDays: number;
  pkg: PurchasesPackage | null;
}

/**
 * RevenueCat. App user id = Supabase user id, so the webhook can update the profile.
 * Without SDK keys (browser, local dev) offerings are mocked and purchases are refused:
 * Premium can only be granted by the webhook (service role), never by the app.
 */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly supabase = inject(SupabaseService);
  private readonly plan = inject(PlanService);
  readonly offerings = signal<Offering[]>([]);
  readonly configured = signal(false);
  readonly busy = signal(false);

  async configure(): Promise<void> {
    const userId = this.supabase.userId;
    const platform = Capacitor.getPlatform();
    const apiKey = platform === 'ios' ? environment.revenueCatAppleKey : platform === 'android' ? environment.revenueCatGoogleKey : '';
    if (!userId || !apiKey || !Capacitor.isNativePlatform()) {
      this.offerings.set(mockOfferings());
      this.configured.set(false);
      return;
    }
    await Purchases.configure({ apiKey, appUserID: userId });
    this.configured.set(true);
    await this.loadOfferings();
  }

  async loadOfferings(): Promise<void> {
    if (!this.configured()) return;
    const { current } = await Purchases.getOfferings();
    const packages = current?.availablePackages ?? [];
    this.offerings.set(
      packages.map((pkg) => ({
        identifier: pkg.identifier,
        title: pkg.product.title,
        priceString: pkg.product.priceString,
        period: /annual|year/i.test(pkg.packageType) ? 'yearly' : 'monthly',
        trialDays: pkg.product.introPrice ? PRICING.trialDaysYearly : 0,
        pkg,
      })),
    );
  }

  /** Returns true when the entitlement is active after the purchase. */
  async purchase(offering: Offering): Promise<boolean> {
    if (!this.configured() || !offering.pkg) {
      throw new Error('Purchases are only available in the iOS and Android apps.');
    }
    this.busy.set(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: offering.pkg });
      const active = !!customerInfo.entitlements.active[PRICING.entitlementId];
      // The webhook updates the profile; refresh after a short delay so the UI catches up.
      setTimeout(() => void this.plan.load(), 2000);
      return active;
    } finally {
      this.busy.set(false);
    }
  }

  async restore(): Promise<boolean> {
    if (!this.configured()) throw new Error('Restore is only available in the iOS and Android apps.');
    const { customerInfo } = await Purchases.restorePurchases();
    setTimeout(() => void this.plan.load(), 2000);
    return !!customerInfo.entitlements.active[PRICING.entitlementId];
  }
}

function mockOfferings(): Offering[] {
  return [
    { identifier: 'monthly', title: 'Premium monthly', priceString: `$${PRICING.monthlyUsd}/month`, period: 'monthly', trialDays: 0, pkg: null },
    { identifier: 'yearly', title: 'Premium yearly', priceString: `$${PRICING.yearlyUsd}/year`, period: 'yearly', trialDays: PRICING.trialDaysYearly, pkg: null },
  ];
}
