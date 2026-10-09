import { Injectable, inject } from '@angular/core';
import type { Database, Grade } from '@courtvault/shared';
import { SupabaseService } from '../supabase/supabase.service';

export type SearchResult = Database['public']['Functions']['search_catalog']['Returns'][number];
export type RookieRanking = Database['public']['Functions']['rookie_rankings']['Returns'][number];

export interface ParallelWithPrices {
  id: string;
  name: string;
  serial_run: number | null;
  prices: Partial<
    Record<
      Grade,
      {
        price_cents: number;
        captured_at: string;
        buy_url: string | null;
        sample_size: number;
        price_kind: string;
        sale_at: string | null;
      }
    >
  >;
}

export interface CardDetail {
  id: string;
  slug: string;
  number: string;
  is_rookie: boolean;
  player: { id: string; name: string; slug: string; team: string | null };
  set: { id: string; name: string; slug: string; season: string };
  parallels: ParallelWithPrices[];
}

/** Public catalog: sets, cards, parallels, prices. Read-only. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly supabase = inject(SupabaseService);

  async search(q: string): Promise<SearchResult[]> {
    if (!q.trim()) return [];
    const { data, error } = await this.supabase.client.rpc('search_catalog', {
      q: q.trim(),
      p_limit: 20,
    });
    if (error) throw error;
    return data ?? [];
  }

  async rookieRankings(limit = 20): Promise<RookieRanking[]> {
    const { data, error } = await this.supabase.client.rpc('rookie_rankings', { p_limit: limit });
    if (error) throw error;
    return data ?? [];
  }

  async cardBySlug(slug: string): Promise<CardDetail | null> {
    return this.card('slug', slug);
  }

  async cardById(id: string): Promise<CardDetail | null> {
    return this.card('id', id);
  }

  async cardByParallelId(parallelId: string): Promise<CardDetail | null> {
    const { data, error } = await this.supabase.client
      .from('parallels')
      .select('card_id')
      .eq('id', parallelId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.card('id', data.card_id) : null;
  }

  private async card(column: 'id' | 'slug', value: string): Promise<CardDetail | null> {
    const { data, error } = await this.supabase.client
      .from('cards')
      .select(
        'id, slug, number, is_rookie, players(id, name, slug, team), card_sets(id, name, slug, season), parallels(id, name, serial_run)',
      )
      // Website deep links carry the public slug, in-app links the internal one.
      .or(column === 'slug' ? `slug.eq.${value},public_slug.eq.${value}` : `id.eq.${value}`)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.players || !data.card_sets) return null;
    const parallels = data.parallels ?? [];
    const { data: prices, error: pricesError } = await this.supabase.client
      .from('latest_prices')
      .select(
        'parallel_id, grade, price_cents, captured_at, buy_url, sample_size, price_kind, sale_at',
      )
      .in(
        'parallel_id',
        parallels.map((p) => p.id),
      );
    if (pricesError) throw pricesError;
    const byParallel = new Map<string, ParallelWithPrices['prices']>();
    for (const p of prices ?? []) {
      if (!p.parallel_id || !p.grade || p.price_cents === null) continue;
      const entry = byParallel.get(p.parallel_id) ?? {};
      entry[p.grade] = {
        price_cents: p.price_cents,
        captured_at: p.captured_at ?? '',
        buy_url: p.buy_url,
        sample_size: p.sample_size ?? 0,
        price_kind: p.price_kind ?? 'ask_median',
        sale_at: p.sale_at ?? null,
      };
      byParallel.set(p.parallel_id, entry);
    }
    return {
      id: data.id,
      slug: data.slug,
      number: data.number,
      is_rookie: data.is_rookie,
      player: data.players,
      set: data.card_sets,
      parallels: parallels
        .map((p) => ({ ...p, prices: byParallel.get(p.id) ?? {} }))
        .sort((a, b) =>
          a.name === 'Base'
            ? -1
            : b.name === 'Base'
              ? 1
              : (b.serial_run ?? 1e9) - (a.serial_run ?? 1e9),
        ),
    };
  }

  async priceHistory(
    parallelId: string,
    grade: Grade,
  ): Promise<{ captured_at: string; price_cents: number }[]> {
    const { data, error } = await this.supabase.client.rpc('price_history', {
      p_parallel_id: parallelId,
      p_grade: grade,
    });
    if (error) throw error;
    return data ?? [];
  }

  async sets() {
    const { data, error } = await this.supabase.client.rpc('set_progress');
    if (error) throw error;
    return data ?? [];
  }

  async setCards(setId: string) {
    const { data, error } = await this.supabase.client
      .from('cards')
      .select('id, slug, number, is_rookie, players(name, slug, team)')
      .eq('set_id', setId);
    if (error) throw error;
    return (data ?? []).sort(
      (a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number),
    );
  }

  async players() {
    const { data, error } = await this.supabase.client
      .from('players')
      .select('id, name, slug, team')
      .order('name');
    if (error) throw error;
    return data ?? [];
  }
}
