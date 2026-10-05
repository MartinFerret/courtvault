import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel,
  IonList, IonNote, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar,
} from '@ionic/angular';
import { PRICE_LABEL, type Grade } from '@courtvault/shared';
import { CollectionService } from '../../core/collection/collection.service';
import { PlanService } from '../../core/plan/plan.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { CentsPipe, DeltaPipe, GradePipe, ParallelPipe } from '../../shared/pipes';

type Filter = 'all' | 'rookies' | 'numbered' | 'graded';

@Component({
  selector: 'cv-vault',
  imports: [
    RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem, IonItemSliding, IonItemOptions,
    IonItemOption, IonLabel, IonNote, IonIcon, IonSearchbar, IonSegment, IonSegmentButton, IonRefresher, IonRefresherContent,
    CentsPipe, DeltaPipe, ParallelPipe, GradePipe,
  ],
  templateUrl: './vault.page.html',
})
export class VaultPage {
  readonly collection = inject(CollectionService);
  readonly plan = inject(PlanService);
  private readonly paywall = inject(PaywallService);
  readonly priceLabel = PRICE_LABEL;

  readonly filter = signal<Filter>('all');
  readonly query = signal('');

  readonly visible = computed(() => {
    const q = this.query().toLowerCase();
    const f = this.filter();
    return this.collection.items().filter((i) => {
      if (f === 'rookies' && !i.is_rookie) return false;
      if (f === 'numbered' && !i.serial_run) return false;
      if (f === 'graded' && i.grade === 'RAW') return false;
      if (q && !`${i.player_name} ${i.set_name} ${i.parallel_name} ${i.card_number}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  readonly cardLimit = computed(() => this.plan.limitFor('cards'));

  constructor() {
    void this.refresh();
    void this.plan.load();
  }

  async refresh(event?: CustomEvent): Promise<void> {
    try {
      await this.collection.refresh();
    } finally {
      (event?.target as { complete?: () => void } | null)?.complete?.();
    }
  }

  remove(id: string): void {
    void this.collection.remove(id);
  }

  onFilter(value: string | number | undefined): void {
    if (value === 'all' || value === 'rookies' || value === 'numbered' || value === 'graded') this.filter.set(value);
  }

  openPaywall(): void {
    void this.paywall.open('cards');
  }

  gradeOf(value: string): Grade {
    return value as Grade;
  }
}
