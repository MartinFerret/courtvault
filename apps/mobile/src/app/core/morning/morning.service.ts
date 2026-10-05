import { Injectable, inject, signal } from '@angular/core';
import type { Database } from '@courtvault/shared';
import { SupabaseService } from '../supabase/supabase.service';

export type MorningRow = Database['public']['Functions']['morning_report']['Returns'][number];

/** "Last night": the morning report computed by the database. */
@Injectable({ providedIn: 'root' })
export class MorningService {
  private readonly supabase = inject(SupabaseService);
  readonly rows = signal<MorningRow[]>([]);
  readonly day = signal<string | null>(null);
  readonly loading = signal(false);

  async load(day?: string): Promise<void> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client.rpc('morning_report', day ? { p_day: day } : {});
      if (error) throw error;
      this.rows.set(data ?? []);
      this.day.set(data?.[0]?.game_day ?? day ?? null);
    } finally {
      this.loading.set(false);
    }
  }
}
