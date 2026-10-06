import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonFooter, IonHeader, IonItem, IonLabel, IonList, IonNote, IonSearchbar, IonTitle, IonToolbar, IonIcon } from '@ionic/angular';
import { parseLimitReached } from '@courtvault/shared';
import { CatalogService } from '../../core/catalog/catalog.service';
import { FollowsService } from '../../core/follows/follows.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { PlanService } from '../../core/plan/plan.service';

@Component({
  selector: 'cv-pick-players',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonSearchbar, IonList, IonItem, IonLabel, IonButton, IonNote, IonIcon],
  templateUrl: './pick-players.page.html',
})
export class PickPlayersPage {
  private readonly catalog = inject(CatalogService);
  readonly follows = inject(FollowsService);
  private readonly plan = inject(PlanService);
  private readonly paywall = inject(PaywallService);
  private readonly router = inject(Router);

  readonly players = signal<{ id: string; name: string; team: string | null }[]>([]);
  readonly query = signal('');
  readonly error = signal<string | null>(null);

  constructor() {
    void this.plan.load();
    void this.follows.refresh();
    void this.catalog.players().then((p) => this.players.set(p));
  }

  filtered() {
    const q = this.query().toLowerCase();
    return this.players().filter((p) => !q || p.name.toLowerCase().includes(q) || (p.team ?? '').toLowerCase().includes(q));
  }

  limit(): number | null {
    return this.plan.limitFor('followed_players');
  }

  async toggle(playerId: string): Promise<void> {
    this.error.set(null);
    try {
      if (this.follows.playerIds().has(playerId)) await this.follows.unfollowPlayer(playerId);
      else await this.follows.followPlayer(playerId);
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.error.set(err instanceof Error ? err.message : 'Could not update.');
    }
  }

  next(): void {
    void this.router.navigate(['/onboarding/first-scan']);
  }
}
