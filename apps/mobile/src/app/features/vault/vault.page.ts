import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular';
import { PRICE_LABEL, type Grade } from '@courtvault/shared';
import { CollectionService } from '../../core/collection/collection.service';
import { PlanService } from '../../core/plan/plan.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { LayoutService } from '../../core/layout/layout.service';
import { VaultTableComponent } from './vault-table.component';
import {
  CentsPipe,
  DeltaPipe,
  FoilClassPipe,
  FoilHuePipe,
  FoilSatPipe,
  GradePipe,
  ParallelPipe,
} from '../../shared/pipes';

type Filter = 'all' | 'rookies' | 'numbered' | 'graded';

import { ShareService, shareErrorMessage } from '../../core/share/share.service';

@Component({
  selector: 'cv-vault',
  imports: [
    RouterLink,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    IonNote,
    IonIcon,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonRefresher,
    IonRefresherContent,
    CentsPipe,
    DeltaPipe,
    ParallelPipe,
    GradePipe,
    FoilClassPipe,
    FoilHuePipe,
    FoilSatPipe,
    VaultTableComponent,
  ],
  templateUrl: './vault.page.html',
})
export class VaultPage {
  readonly collection = inject(CollectionService);
  private readonly sharing = inject(ShareService);
  readonly shareNote = signal<string | null>(null);

  async shareBest(): Promise<void> {
    try {
      const how = await this.sharing.share('vault', 'My best cards');
      this.shareNote.set(how === 'copied' ? 'Link copied: your three most valuable cards.' : null);
    } catch (err) {
      this.shareNote.set(shareErrorMessage(err));
    }
  }
  readonly plan = inject(PlanService);
  readonly layout = inject(LayoutService);
  private readonly paywall = inject(PaywallService);
  readonly message = signal<string | null>(null);
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
      if (
        q &&
        !`${i.player_name} ${i.set_name} ${i.parallel_name} ${i.card_number}`
          .toLowerCase()
          .includes(q)
      )
        return false;
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

  async removeMany(ids: string[]): Promise<void> {
    await this.collection.removeMany(ids);
    this.message.set(`${ids.length} card${ids.length > 1 ? 's' : ''} removed.`);
  }

  async changeGrade(change: { ids: string[]; grade: Grade }): Promise<void> {
    await this.collection.updateGrade(change.ids, change.grade);
    this.message.set(
      `Grade updated on ${change.ids.length} card${change.ids.length > 1 ? 's' : ''}.`,
    );
  }

  async exportCsv(): Promise<void> {
    const mode = this.plan.isPremium() ? 'full' : 'basic';
    try {
      const blob = await this.collection.exportCsv(mode);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hoopticker-vault-${mode}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.message.set('Export downloaded.');
    } catch (err) {
      this.message.set(err instanceof Error ? err.message : 'Export failed.');
    }
  }

  onFilter(value: string | number | undefined): void {
    if (value === 'all' || value === 'rookies' || value === 'numbered' || value === 'graded')
      this.filter.set(value);
  }

  /** From the gains column and the "See gains and losses" chip. */
  openPaywall(): void {
    void this.paywall.open('gains');
  }

  gradeOf(value: string): Grade {
    return value as Grade;
  }
}
