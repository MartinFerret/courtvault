import { Injectable, effect, inject, untracked } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from './analytics.service';
import { captureLandingAttribution, readAttribution, setSignedInFlag } from './cross-site';

/**
 * Session side effects shared with the website and PostHog: the signed-in flag cookie, the
 * PostHog identity, and the first-touch attribution copied once into the profile at sign-up
 * (`set_acquisition`), which also fires `signup_completed` for brand-new accounts.
 */
@Injectable({ providedIn: 'root' })
export class AcquisitionService {
  private readonly supabase = inject(SupabaseService);
  private readonly analytics = inject(AnalyticsService);
  private lastUserId: string | null = null;

  init(): void {
    captureLandingAttribution();
    this.analytics.init();
    effect(() => {
      const ready = this.supabase.ready();
      const session = this.supabase.session();
      if (!ready) return;
      untracked(() => void this.onSession(session?.user ?? null));
    });
  }

  private async onSession(user: { id: string; created_at?: string } | null): Promise<void> {
    setSignedInFlag(!!user);
    if (!user) {
      if (this.lastUserId) this.analytics.reset();
      this.lastUserId = null;
      return;
    }
    if (this.lastUserId === user.id) return;
    this.lastUserId = user.id;
    const attr = readAttribution();
    this.analytics.identify(user.id, prefixed(attr));
    try {
      const { data: recorded } = await this.supabase.client.rpc('set_acquisition', {
        p_attr: attr,
      });
      const isNew = !!user.created_at && Date.now() - Date.parse(user.created_at) < 60 * 60 * 1000;
      if (recorded && isNew) {
        this.analytics.capture('signup_completed', {
          utm_source: attr['utm_source'] ?? null,
          utm_campaign: attr['utm_campaign'] ?? null,
          referred: !!attr['ref'],
        });
      }
    } catch {
      /* attribution is best effort; it never blocks sign-in */
    }
  }
}

/** PostHog person properties set once: initial_utm_source, initial_ref... */
function prefixed(attr: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attr)) out[`initial_${k}`] = v;
  return out;
}
