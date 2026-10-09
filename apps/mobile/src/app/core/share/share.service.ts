import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from '../analytics/analytics.service';

export type ShareKind = 'lineup' | 'league' | 'vault';

/**
 * Shares point to public pages on the website (hoopticker.com/share/<code>, with a generated
 * image), league invites to /join/<code> and referrals to /r/<code>: visitors meet
 * HoopTicker before landing in the app.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly supabase = inject(SupabaseService);
  private readonly analytics = inject(AnalyticsService);

  /** Creates the snapshot, then opens the share sheet (or copies the link). */
  async share(
    kind: ShareKind,
    title: string,
    leagueId: string | null = null,
  ): Promise<'shared' | 'copied'> {
    const { data, error } = await this.supabase.client.rpc('create_share', {
      p_kind: kind,
      p_league_id: leagueId ?? undefined,
    });
    if (error) throw error;
    const url = `${environment.webUrl}/share/${data as string}`;
    this.analytics.capture('share_created', { kind });
    return this.send(title, url);
  }

  leagueInviteUrl(code: string): string {
    return `${environment.webUrl}/join/${code}`;
  }

  async referralUrl(): Promise<string> {
    const { data, error } = await this.supabase.client.rpc('my_referral_code');
    if (error) throw error;
    return `${environment.webUrl}/r/${data as string}`;
  }

  async send(title: string, url: string, text?: string): Promise<'shared' | 'copied'> {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text, url });
        return 'shared';
      } catch {
        /* dismissed or unsupported content: fall back to the clipboard */
      }
    }
    await navigator.clipboard.writeText(text ? `${text} ${url}` : url);
    return 'copied';
  }
}

/** Human message for share errors. */
export function shareErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? '');
  if (/SHARE_EMPTY:lineup/.test(text))
    return 'Nothing to share yet: your first score arrives the morning after your first lineup.';
  if (/SHARE_EMPTY/.test(text)) return 'Nothing to share yet.';
  if (/RATE_LIMITED:share/.test(text)) return 'You shared a lot today. Try again tomorrow.';
  return 'Could not create the share link.';
}
