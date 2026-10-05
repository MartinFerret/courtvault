import { Injectable, signal } from '@angular/core';

/**
 * Single entry point to open the paywall. Kept separate from the billing service so the
 * global error handler has no dependency on RevenueCat.
 */
@Injectable({ providedIn: 'root' })
export class PaywallService {
  /** The plan limit key that triggered the paywall, or null when opened from the profile. */
  readonly reason = signal<string | null>(null);
  readonly isOpen = signal(false);

  open(reason: string | null = null): Promise<void> {
    this.reason.set(reason);
    this.isOpen.set(true);
    return Promise.resolve();
  }

  close(): void {
    this.isOpen.set(false);
  }
}
