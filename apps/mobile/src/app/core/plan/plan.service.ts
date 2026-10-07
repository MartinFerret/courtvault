import { Injectable, computed, inject, signal } from '@angular/core';
import type { PlanLimitKey, Tables } from '@courtvault/shared';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Plan limits and Premium status, read from the database for display only.
 * Enforcement happens in the database (LIMIT_REACHED:<key> errors).
 */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly supabase = inject(SupabaseService);

  readonly limits = signal<Record<string, { free: number | null; premium: number | null }>>({});
  readonly profile = signal<Tables<'profiles'> | null>(null);

  readonly isPremium = computed(() => {
    const p = this.profile();
    if (!p?.is_premium) return false;
    return !p.premium_until || new Date(p.premium_until) > new Date();
  });

  async load(): Promise<void> {
    const [{ data: limits }, { data: profile }] = await Promise.all([
      this.supabase.client.from('plan_limits').select('key, free_value, premium_value'),
      this.supabase.userId
        ? this.supabase.client
            .from('profiles')
            .select('*')
            .eq('id', this.supabase.userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const map: Record<string, { free: number | null; premium: number | null }> = {};
    for (const l of limits ?? []) map[l.key] = { free: l.free_value, premium: l.premium_value };
    this.limits.set(map);
    this.profile.set(profile ?? null);
  }

  /** Email preferences: digest frequency and marketing consent (own profile columns only). */
  async updateEmailPreferences(patch: {
    digest_frequency?: 'daily' | 'weekly' | 'off';
    marketing?: boolean;
  }): Promise<void> {
    const userId = this.supabase.userId;
    if (!userId) return;
    const update: {
      digest_frequency?: string;
      marketing_consent_at?: string | null;
      marketing_consent_source?: string | null;
    } = {};
    if (patch.digest_frequency) update.digest_frequency = patch.digest_frequency;
    if (patch.marketing !== undefined) {
      update.marketing_consent_at = patch.marketing ? new Date().toISOString() : null;
      update.marketing_consent_source = patch.marketing ? 'web' : null;
    }
    const { error } = await this.supabase.client.from('profiles').update(update).eq('id', userId);
    if (error) throw error;
    this.profile.update((p) => (p ? { ...p, ...update } : p));
  }

  /** Limit that applies to the current user, null = unlimited. */
  limitFor(key: PlanLimitKey): number | null {
    const l = this.limits()[key];
    if (!l) return null;
    return this.isPremium() ? l.premium : l.free;
  }
}
