import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { parseLimitReached } from '@courtvault/shared';
import { GameService, gameErrorMessage, type Standings } from '../../core/game/game.service';
import { PaywallService } from '../../core/billing/paywall.service';

/** Broadcast-style leaderboard: global or a league, this week or the season. */
@Component({
  selector: 'cv-standings',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
  ],
  templateUrl: './standings.page.html',
})
export class StandingsPage {
  readonly game = inject(GameService);
  private readonly paywall = inject(PaywallService);
  private readonly route = inject(ActivatedRoute);

  readonly scope = signal<string>(this.route.snapshot.queryParamMap.get('league') ?? 'global');
  readonly period = signal<'week' | 'season'>('week');
  readonly key = signal<string | null>(null);
  readonly data = signal<Standings | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly meOutside = computed(() => {
    const d = this.data();
    return !!d?.me && !d.rows.some((r) => r.is_me);
  });
  readonly periodLabel = computed(() => {
    const d = this.data();
    if (!d) return '';
    if (d.period === 'season')
      return d.key === d.current_season ? 'This season' : `Season ${d.key}`;
    const start = new Date(`${d.key}T12:00:00Z`);
    const end = new Date(start.getTime() + 6 * 86400000);
    const fmt = (x: Date) =>
      x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return `${d.key === d.current_week ? 'This week' : 'Week'}, ${fmt(start)} to ${fmt(end)}`;
  });

  constructor() {
    void this.game.loadLeagues().catch(() => null);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const scope = this.scope();
      const data =
        scope === 'global'
          ? await this.game.standings('global', this.period(), null, this.key())
          : await this.game.standings('league', this.period(), scope, this.key());
      this.data.set(data);
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) {
        void this.paywall.open(limit.key);
        this.key.set(null);
      } else {
        this.error.set(gameErrorMessage(err));
      }
    } finally {
      this.loading.set(false);
    }
  }

  setScope(value: string): void {
    this.scope.set(value);
    this.key.set(null);
    void this.load();
  }

  setPeriod(value: 'week' | 'season'): void {
    this.period.set(value);
    this.key.set(null);
    void this.load();
  }

  /** Past weeks are Premium: the database answers LIMIT_REACHED:game_history for free users. */
  previousWeek(): void {
    const d = this.data();
    if (!d) return;
    const prev = new Date(new Date(`${d.key}T12:00:00Z`).getTime() - 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    this.key.set(prev);
    void this.load();
  }

  thisWeek(): void {
    this.key.set(null);
    void this.load();
  }
}
