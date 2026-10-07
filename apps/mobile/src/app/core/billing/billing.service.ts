import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { PRICING, formatUsd, yearlySavingsPercent } from '@courtvault/shared';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';
import { PlanService } from '../plan/plan.service';

export type PlanId = 'monthly' | 'yearly' | 'lifetime';

export interface Offering {
  identifier: PlanId;
  title: string;
  priceString: string;
  period: 'monthly' | 'yearly' | 'lifetime';
  trialDays: number;
  /** "Save 30% vs monthly", computed from PRICING, never typed. */
  note: string | null;
  pkg: PurchasesPackage | null;
}

export interface FoundersStatus {
  enabled: boolean;
  ends_at: string | null;
  cap: number;
  sold: number;
  remaining: number;
  available: boolean;
}

/**
 * Billing. Native: RevenueCat (App Store, Google Play), app user id = Supabase user id so
 * the webhook updates the profile. Web: Stripe hosted Checkout through the create-checkout
 * function and the Customer Portal through billing-portal. Premium is never granted here:
 * only the webhooks (service role) write it.
 */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly supabase = inject(SupabaseService);
  private readonly plan = inject(PlanService);
  readonly offerings = signal<Offering[]>([]);
  readonly founders = signal<FoundersStatus | null>(null);
  readonly configured = signal(false);
  readonly busy = signal(false);
  readonly isWeb = !Capacitor.isNativePlatform();

  /** Lifetime offer shown only while open; its remaining count is the real one. */
  readonly lifetimeOffering = computed<Offering | null>(() => {
    const f = this.founders();
    if (!f?.available) return null;
    return {
      identifier: 'lifetime',
      title: "Founder's Lifetime",
      priceString: `${formatUsd(PRICING.lifetimeUsd)} once`,
      period: 'lifetime',
      trialDays: 0,
      note: `${f.remaining} of ${f.cap} spots left`,
      pkg: null,
    };
  });

  async configure(): Promise<void> {
    void this.loadFounders();
    const userId = this.supabase.userId;
    const platform = Capacitor.getPlatform();
    const apiKey =
      platform === 'ios'
        ? environment.revenueCatAppleKey
        : platform === 'android'
          ? environment.revenueCatGoogleKey
          : '';
    if (!userId || !apiKey || this.isWeb) {
      this.offerings.set(webOfferings());
      // Web checkout is live as soon as the edge functions have Stripe keys; the app cannot
      // know that, so the button is always offered and the function answers with a clear error.
      this.configured.set(this.isWeb);
      return;
    }
    await Purchases.configure({ apiKey, appUserID: userId });
    this.configured.set(true);
    await this.loadOfferings();
  }

  async loadFounders(): Promise<void> {
    const { data } = await this.supabase.client.rpc('founders_lifetime_status');
    this.founders.set((data?.[0] as FoundersStatus | undefined) ?? null);
  }

  async loadOfferings(): Promise<void> {
    if (!this.configured() || this.isWeb) return;
    const { current } = await Purchases.getOfferings();
    const packages = current?.availablePackages ?? [];
    this.offerings.set(
      packages
        .map((pkg): Offering | null => {
          const id = pkg.product.identifier;
          const identifier: PlanId | null =
            id === PRICING.products.monthly
              ? 'monthly'
              : id === PRICING.products.yearly
                ? 'yearly'
                : id === PRICING.products.lifetime
                  ? 'lifetime'
                  : null;
          if (!identifier) return null;
          return {
            identifier,
            title: pkg.product.title,
            priceString: pkg.product.priceString,
            period: identifier,
            trialDays: pkg.product.introPrice ? PRICING.trialDaysYearly : 0,
            note: identifier === 'yearly' ? `Save ${yearlySavingsPercent()}% vs monthly` : null,
            pkg,
          };
        })
        .filter((o): o is Offering => o !== null),
    );
  }

  /** Native: returns true when the entitlement is active. Web: redirects to Stripe Checkout. */
  async purchase(offering: Offering): Promise<boolean> {
    this.busy.set(true);
    try {
      if (this.isWeb) {
        const { url } = await this.supabase.invoke<{ url: string }>('create-checkout', {
          plan: offering.identifier,
        });
        location.assign(url);
        return false;
      }
      if (!this.configured() || !offering.pkg)
        throw new Error('Purchases are only available in the iOS and Android apps.');
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
    if (this.isWeb) {
      await this.plan.load();
      return this.plan.isPremium();
    }
    if (!this.configured())
      throw new Error('Restore is only available in the iOS and Android apps.');
    const { customerInfo } = await Purchases.restorePurchases();
    setTimeout(() => void this.plan.load(), 2000);
    return !!customerInfo.entitlements.active[PRICING.entitlementId];
  }

  /** Web: Stripe Customer Portal (change plan, cancel, invoices). */
  async openPortal(): Promise<void> {
    const { url } = await this.supabase.invoke<{ url: string }>('billing-portal', {});
    location.assign(url);
  }
}

/** The plans as sold on the web, from the single source of truth. Lifetime is added when open. */
function webOfferings(): Offering[] {
  return [
    {
      identifier: 'yearly',
      title: 'Premium yearly',
      priceString: `${formatUsd(PRICING.yearlyUsd)}/year`,
      period: 'yearly',
      trialDays: PRICING.trialDaysYearly,
      note: `Save ${yearlySavingsPercent()}% vs monthly`,
      pkg: null,
    },
    {
      identifier: 'monthly',
      title: 'Premium monthly',
      priceString: `${formatUsd(PRICING.monthlyUsd)}/month`,
      period: 'monthly',
      trialDays: 0,
      note: null,
      pkg: null,
    },
  ];
}
