import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular';
import { formatEasternDay } from '@courtvault/shared';
import { MorningService } from '../../core/morning/morning.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { PlanService } from '../../core/plan/plan.service';
import { DeltaPipe } from '../../shared/pipes';

/** "Last night": stat lines of followed/owned players and how the games moved the user's cards. */
import { RecapComponent } from '../game/recap.component';

@Component({
  selector: 'cv-last-night',
  imports: [
    RecapComponent,
    RouterLink,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonIcon,
    IonButton,
    IonRefresher,
    IonRefresherContent,
    DeltaPipe,
  ],
  templateUrl: './last-night.page.html',
})
export class LastNightPage {
  readonly morning = inject(MorningService);
  readonly plan = inject(PlanService);
  private readonly paywall = inject(PaywallService);

  readonly dayLabel = computed(() => {
    const d = this.morning.day();
    return d ? formatEasternDay(d) : 'Last night';
  });
  readonly totalChange = computed(() =>
    this.morning
      .rows()
      .reduce((sum, r) => sum + ((r.value_after_cents ?? 0) - (r.value_before_cents ?? 0)), 0),
  );
  readonly lockedCount = computed(() => this.morning.rows().filter((r) => r.locked).length);

  constructor() {
    void this.morning.load();
    void this.plan.load();
  }

  async refresh(event?: CustomEvent): Promise<void> {
    try {
      await this.morning.load();
    } finally {
      (event?.target as { complete?: () => void } | null)?.complete?.();
    }
  }

  change(r: {
    value_after_cents: number | null;
    value_before_cents: number | null;
  }): number | null {
    if (r.value_after_cents === null || r.value_before_cents === null) return null;
    return r.value_after_cents - r.value_before_cents;
  }

  percent(r: { value_after_cents: number | null; value_before_cents: number | null }): string {
    const c = this.change(r);
    if (c === null || !r.value_before_cents) return '';
    const pct = (c / r.value_before_cents) * 100;
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }

  unlock(): void {
    void this.paywall.open('followed_players');
  }
}
