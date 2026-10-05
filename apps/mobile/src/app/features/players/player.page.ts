import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';
import { parseLimitReached } from '@courtvault/shared';
import { FollowsService } from '../../core/follows/follows.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

interface PlayerView {
  id: string;
  name: string;
  slug: string;
  team: string | null;
  cards: { id: string; slug: string; number: string; is_rookie: boolean; card_sets: { name: string; season: string } | null }[];
}

@Component({
  selector: 'cv-player',
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonContent, IonList, IonItem, IonLabel, IonIcon],
  templateUrl: './player.page.html',
})
export class PlayerPage {
  private readonly supabase = inject(SupabaseService);
  readonly follows = inject(FollowsService);
  private readonly paywall = inject(PaywallService);
  readonly slug = input.required<string>();
  readonly player = signal<PlayerView | null>(null);

  constructor() {
    void this.follows.refresh();
    effect(() => {
      const slug = this.slug();
      void this.load(slug);
    });
  }

  private async load(slug: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('players')
      .select('id, name, slug, team, cards(id, slug, number, is_rookie, card_sets(name, season))')
      .eq('slug', slug)
      .maybeSingle();
    this.player.set(data as PlayerView | null);
  }

  async toggleFollow(): Promise<void> {
    const p = this.player();
    if (!p) return;
    try {
      if (this.follows.playerIds().has(p.id)) await this.follows.unfollowPlayer(p.id);
      else await this.follows.followPlayer(p.id);
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
    }
  }
}
