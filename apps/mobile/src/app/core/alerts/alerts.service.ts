import { Injectable, inject, signal } from '@angular/core';
import type { Grade, Tables } from '@courtvault/shared';
import { SupabaseService } from '../supabase/supabase.service';

export type PriceAlert = Tables<'price_alerts'>;

/** Price alerts. The database enforces the plan limit; job-alerts fires them. */
@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly supabase = inject(SupabaseService);
  readonly alerts = signal<PriceAlert[]>([]);

  async refresh(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('price_alerts')
      .select('*')
      .order('created_at');
    if (error) throw error;
    this.alerts.set(data ?? []);
  }

  async create(parallelId: string, grade: Grade, belowCents: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('price_alerts')
      .insert({ parallel_id: parallelId, grade, below_cents: belowCents });
    if (error) throw error;
    await this.refresh();
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('price_alerts').delete().eq('id', id);
    if (error) throw error;
    await this.refresh();
  }

  forParallel(parallelId: string, grade: Grade): PriceAlert | undefined {
    return this.alerts().find(
      (a) => a.parallel_id === parallelId && a.grade === grade && !a.triggered_at,
    );
  }
}
