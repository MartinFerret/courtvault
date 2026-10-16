import { Injectable, inject, signal } from '@angular/core';
import type { Database } from '@courtvault/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CollectionService } from '../collection/collection.service';

export type BinderSummary = Database['public']['Functions']['binder_summaries']['Returns'][number];

/**
 * Binders: named groups of Vault cards. The free plan allows one, Premium unlimited; the
 * database raises `LIMIT_REACHED:binders` and the caller opens the paywall.
 */
@Injectable({ providedIn: 'root' })
export class BindersService {
  private readonly supabase = inject(SupabaseService);
  private readonly analytics = inject(AnalyticsService);
  private readonly collection = inject(CollectionService);

  readonly binders = signal<BinderSummary[]>([]);

  async refresh(): Promise<void> {
    const { data, error } = await this.supabase.client.rpc('binder_summaries');
    if (error) throw error;
    this.binders.set(data ?? []);
  }

  async create(name: string): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('binders')
      .insert({ name: name.trim() })
      .select('id')
      .single();
    if (error) throw error;
    this.analytics.capture('binder_created');
    await this.refresh();
    return data.id;
  }

  async rename(id: string, name: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('binders')
      .update({ name: name.trim() })
      .eq('id', id);
    if (error) throw error;
    await Promise.all([this.refresh(), this.collection.refresh()]);
  }

  /** Deleting a binder keeps its cards in the Vault, unfiled. */
  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('binders').delete().eq('id', id);
    if (error) throw error;
    await Promise.all([this.refresh(), this.collection.refresh()]);
  }

  /** Files cards in a binder, or takes them out (null). */
  async move(itemIds: string[], binderId: string | null): Promise<void> {
    if (itemIds.length === 0) return;
    const { error } = await this.supabase.client
      .from('collection_items')
      .update({ binder_id: binderId })
      .in('id', itemIds);
    if (error) throw error;
    await Promise.all([this.refresh(), this.collection.refresh()]);
  }
}

/** Human message for binder errors other than the plan limit. */
export function binderErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? '');
  if (/binders_user_name_idx|duplicate key/.test(text))
    return 'You already have a binder with this name.';
  if (/check constraint/.test(text)) return 'A binder name has 1 to 40 characters.';
  return 'Could not save the binder.';
}
