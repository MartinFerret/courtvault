import { ErrorHandler, Injectable, inject } from '@angular/core';
import { parseLimitReached } from '@courtvault/shared';
import { PaywallService } from '../billing/paywall.service';

/**
 * Maps database `LIMIT_REACHED:<key>` errors to the paywall, as required by the brief.
 * Everything else is logged. Services should still catch limit errors locally when they
 * want to show inline feedback; this handler is the safety net.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly paywall = inject(PaywallService);

  handleError(error: unknown): void {
    const limit = parseLimitReached(error);
    if (limit) {
      void this.paywall.open(limit.key);
      return;
    }
    console.error(error);
  }
}
