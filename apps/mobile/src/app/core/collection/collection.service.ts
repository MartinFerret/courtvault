import { Injectable, inject, signal } from '@angular/core';
import type { Database, Grade } from '@courtvault/shared';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';

export type CollectionItem = Database['public']['Views']['collection_items_detailed']['Row'];
export type CollectionSummary = Database['public']['Functions']['collection_summary']['Returns'][number];

export interface AddItemInput {
  parallelId: string;
  grade: Grade;
  serialNumber?: number | null;
  purchaseCents?: number | null;
  photo?: Blob | null;
}

/**
 * The user's collection ("Vault"). Inserts go through RLS and the plan limit trigger:
 * a `LIMIT_REACHED:cards` error is thrown as-is so callers (or the global handler) open the paywall.
 */
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly supabase = inject(SupabaseService);

  readonly items = signal<CollectionItem[]>([]);
  readonly summary = signal<CollectionSummary | null>(null);
  readonly loading = signal(false);

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const [{ data: items, error }, { data: summary, error: summaryError }] = await Promise.all([
        this.supabase.client.from('collection_items_detailed').select('*').order('created_at', { ascending: false }),
        this.supabase.client.rpc('collection_summary'),
      ]);
      if (error) throw error;
      if (summaryError) throw summaryError;
      this.items.set(items ?? []);
      this.summary.set(summary?.[0] ?? null);
    } finally {
      this.loading.set(false);
    }
  }

  async add(input: AddItemInput): Promise<CollectionItem> {
    const { data, error } = await this.supabase.client
      .from('collection_items')
      .insert({
        parallel_id: input.parallelId,
        grade: input.grade,
        serial_number: input.serialNumber ?? null,
        purchase_cents: input.purchaseCents ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;

    if (input.photo) {
      const path = await this.uploadPhoto(data.id, input.photo);
      await this.supabase.client.from('collection_items').update({ photo_path: path }).eq('id', data.id);
    }

    await this.refresh();
    const item = this.items().find((i) => i.id === data.id);
    if (!item) throw new Error('Item not found after insert');
    return item;
  }

  async remove(id: string): Promise<void> {
    const item = this.items().find((i) => i.id === id);
    if (item?.photo_path) {
      await this.supabase.client.storage.from('card-photos').remove([item.photo_path]);
    }
    const { error } = await this.supabase.client.from('collection_items').delete().eq('id', id);
    if (error) throw error;
    await this.refresh();
  }

  async photoUrl(path: string): Promise<string | null> {
    const { data, error } = await this.supabase.client.storage.from('card-photos').createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  }

  async exportCsv(): Promise<Blob> {
    const session = this.supabase.session();
    if (!session) throw new Error('Not signed in');
    const res = await fetch(`${environment.supabaseUrl}/functions/v1/export-csv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Export failed (${res.status})`);
    }
    return res.blob();
  }

  /** One folder per user; the bucket policy enforces it and the per-plan photo cap. */
  private async uploadPhoto(itemId: string, photo: Blob): Promise<string> {
    const userId = this.supabase.userId;
    if (!userId) throw new Error('Not signed in');
    const path = `${userId}/${itemId}.jpg`;
    const { error } = await this.supabase.client.storage
      .from('card-photos')
      .upload(path, photo, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    return path;
  }
}
