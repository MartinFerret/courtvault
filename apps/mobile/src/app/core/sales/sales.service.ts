import { Injectable, inject, signal } from '@angular/core';
import type { Database } from '@courtvault/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CollectionService } from '../collection/collection.service';
import { BindersService } from '../binders/binders.service';

export type Sale = Database['public']['Views']['sales_detailed']['Row'];
export type SalesSummary = Database['public']['Functions']['sales_summary']['Returns'][number];

export interface SaleInput {
  itemId: string;
  soldCents: number;
  feesCents?: number;
  /** Eastern date, YYYY-MM-DD. Today when omitted. */
  soldOn?: string | null;
}

/**
 * Sales: a sold card leaves the Vault for the sales log (record_sale). Recording is free; the
 * realized gain comes back null on the free plan, decided by the database.
 */
@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly supabase = inject(SupabaseService);
  private readonly analytics = inject(AnalyticsService);
  private readonly collection = inject(CollectionService);
  private readonly binders = inject(BindersService);

  readonly sales = signal<Sale[]>([]);
  readonly summary = signal<SalesSummary | null>(null);

  async refresh(): Promise<void> {
    const [{ data, error }, { data: summary, error: summaryError }] = await Promise.all([
      this.supabase.client
        .from('sales_detailed')
        .select('*')
        .order('sold_on', { ascending: false })
        .order('created_at', { ascending: false }),
      this.supabase.client.rpc('sales_summary'),
    ]);
    if (error) throw error;
    if (summaryError) throw summaryError;
    this.sales.set(data ?? []);
    this.summary.set(summary?.[0] ?? null);
  }

  /** Records each sale in turn; stops at the first error so nothing is half-reported. */
  async record(inputs: SaleInput[]): Promise<void> {
    const photos: string[] = [];
    try {
      for (const input of inputs) {
        const { data, error } = await this.supabase.client.rpc('record_sale', {
          p_item_id: input.itemId,
          p_sold_cents: input.soldCents,
          p_fees_cents: input.feesCents ?? 0,
          p_sold_on: input.soldOn ?? undefined,
        });
        if (error) throw error;
        const photo = (data as { photo_path?: string | null } | null)?.photo_path;
        if (photo) photos.push(photo);
      }
    } finally {
      // The card row is gone: its private photo goes too (best effort).
      if (photos.length > 0) await this.supabase.client.storage.from('card-photos').remove(photos);
      await Promise.all([this.refresh(), this.collection.refresh(), this.binders.refresh()]);
    }
    this.analytics.capture('card_sold', { cards: inputs.length });
  }

  /** Puts the card back in the Vault (the card limit applies) and forgets the sale. */
  async undo(saleId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('undo_sale', { p_sale_id: saleId });
    if (error) throw error;
    await Promise.all([this.refresh(), this.collection.refresh(), this.binders.refresh()]);
  }
}

/** Human message for sale errors other than the plan limit. */
export function saleErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? '');
  if (/SALE_INVALID:amount/.test(text)) return 'Enter the sale price in USD.';
  if (/SALE_INVALID:date/.test(text)) return 'The sale date cannot be in the future.';
  if (/ITEM_NOT_FOUND|SALE_NOT_FOUND/.test(text)) return 'This card is no longer there. Refresh.';
  return 'Could not record the sale.';
}
