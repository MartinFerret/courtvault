import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton } from '@ionic/angular';
import { parseLimitReached } from '@courtvault/shared';
import type { CollectionItem } from '../../core/collection/collection.service';
import { SalesService, saleErrorMessage } from '../../core/sales/sales.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { CentsPipe, GradePipe, ParallelPipe } from '../../shared/pipes';

interface Row {
  item: CollectionItem;
  usd: number | null;
  feesUsd: number | null;
}

/**
 * "Mark as sold" for one card (card page) or several (Vault table). One price per card, optional
 * fees, one date. Sold cards leave the Vault for the sales log.
 */
@Component({
  selector: 'cv-sell-panel',
  imports: [FormsModule, IonButton, CentsPipe, GradePipe, ParallelPipe],
  templateUrl: './sell-panel.component.html',
})
export class SellPanelComponent {
  private readonly sales = inject(SalesService);
  private readonly paywall = inject(PaywallService);

  readonly items = input.required<CollectionItem[]>();
  readonly done = output<number>();
  readonly closed = output<void>();

  readonly rows = computed<Row[]>(() =>
    this.items().map((item) => ({ item, usd: null, feesUsd: null })),
  );
  readonly today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(
    new Date(),
  );
  soldOn = this.today;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ready(rows: Row[]): boolean {
    return rows.length > 0 && rows.every((r) => r.usd !== null && r.usd >= 0);
  }

  async submit(rows: Row[]): Promise<void> {
    if (!this.ready(rows)) {
      this.error.set('Enter a sale price for each card.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.sales.record(
        rows.map((r) => ({
          itemId: r.item.id ?? '',
          soldCents: Math.round((r.usd ?? 0) * 100),
          feesCents: Math.round((r.feesUsd ?? 0) * 100),
          soldOn: this.soldOn || null,
        })),
      );
      this.done.emit(rows.length);
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.error.set(saleErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
