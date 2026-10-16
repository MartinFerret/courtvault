import { Injectable, inject } from '@angular/core';
import type { Grade } from '@courtvault/shared';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ShareService } from '../share/share.service';

export type TradeSide = 'give' | 'get';

export interface TradePick {
  side: TradeSide;
  parallelId: string;
  grade: Grade;
}

export interface TradeItem {
  parallel_id: string;
  grade: Grade;
  player: string;
  set: string;
  season: string;
  number: string;
  parallel: string;
  serial_run: number | null;
  rookie: boolean;
  card_slug: string | null;
  value_cents: number | null;
  price_kind: string | null;
  sale_at: string | null;
}

export interface TradeResult {
  give: { items: TradeItem[]; total_cents: number; unpriced: number };
  get: { items: TradeItem[]; total_cents: number; unpriced: number };
  diff_cents: number;
  verdict: 'fair' | 'you_win' | 'you_lose' | 'unknown';
}

/** Max cards per side, mirrors trade_value() in the database. */
export const TRADE_MAX_PER_SIDE = 10;

/**
 * Trade analyzer: market value of both sides, computed by trade_value() in the database, and a
 * public share page on the website (hoopticker.com/share/<code>) for trades discussed elsewhere.
 */
@Injectable({ providedIn: 'root' })
export class TradeService {
  private readonly supabase = inject(SupabaseService);
  private readonly analytics = inject(AnalyticsService);
  private readonly sharing = inject(ShareService);

  async analyze(picks: TradePick[]): Promise<TradeResult> {
    const { data, error } = await this.supabase.client.rpc('trade_value', {
      p_items: toPayload(picks),
    });
    if (error) throw error;
    return data as unknown as TradeResult;
  }

  async share(picks: TradePick[]): Promise<'shared' | 'copied'> {
    const { data, error } = await this.supabase.client.rpc('create_trade_share', {
      p_items: toPayload(picks),
    });
    if (error) throw error;
    this.analytics.capture('share_created', { kind: 'trade', cards: picks.length });
    return this.sharing.send(
      'Is this trade fair?',
      `${environment.webUrl}/share/${data as string}`,
    );
  }
}

function toPayload(picks: TradePick[]) {
  return picks.map((p) => ({ side: p.side, parallel_id: p.parallelId, grade: p.grade }));
}

/** Plain-language verdict for the result banner. */
export function verdictLabel(result: TradeResult): string {
  switch (result.verdict) {
    case 'fair':
      return 'Fair trade';
    case 'you_win':
      return 'You get more value';
    case 'you_lose':
      return 'You give more value';
    default:
      return 'Not enough prices to judge';
  }
}
