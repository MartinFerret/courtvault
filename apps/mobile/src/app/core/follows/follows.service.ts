import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

/** Followed players ("Last night") and followed checklists ("Sets"). Limits enforced by the database. */
@Injectable({ providedIn: 'root' })
export class FollowsService {
  private readonly supabase = inject(SupabaseService);
  readonly playerIds = signal<Set<string>>(new Set());
  readonly setIds = signal<Set<string>>(new Set());

  async refresh(): Promise<void> {
    const [{ data: players }, { data: sets }] = await Promise.all([
      this.supabase.client.from('followed_players').select('player_id'),
      this.supabase.client.from('checklist_follows').select('set_id'),
    ]);
    this.playerIds.set(new Set((players ?? []).map((p) => p.player_id)));
    this.setIds.set(new Set((sets ?? []).map((s) => s.set_id)));
  }

  async followPlayer(playerId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('followed_players')
      .insert({ player_id: playerId });
    if (error) throw error;
    await this.refresh();
  }

  async unfollowPlayer(playerId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('followed_players')
      .delete()
      .eq('player_id', playerId);
    if (error) throw error;
    await this.refresh();
  }

  async followSet(setId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('checklist_follows')
      .insert({ set_id: setId });
    if (error) throw error;
    await this.refresh();
  }

  async unfollowSet(setId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('checklist_follows')
      .delete()
      .eq('set_id', setId);
    if (error) throw error;
    await this.refresh();
  }
}
