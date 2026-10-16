import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
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
import { PRICE_LABEL, parseLimitReached, type Grade } from '@courtvault/shared';
import { BindersService, binderErrorMessage } from '../../core/binders/binders.service';
import { SalesService, saleErrorMessage } from '../../core/sales/sales.service';
import { SellPanelComponent } from './sell-panel.component';
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
type View = 'cards' | 'sold';
/** 'all' cards, cards in no binder ('none'), or one binder id. */
type BinderFilter = 'all' | 'none' | string;

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
    SellPanelComponent,
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

  readonly binders = inject(BindersService);
  readonly sales = inject(SalesService);
  private readonly alerts = inject(AlertController);

  readonly view = signal<View>('cards');
  readonly binderFilter = signal<BinderFilter>('all');
  /** Cards in the sell panel, null when it is closed. */
  readonly sellIds = signal<string[] | null>(null);
  readonly sellItems = computed(() => {
    const ids = this.sellIds();
    return ids ? this.collection.items().filter((i) => ids.includes(i.id ?? '')) : [];
  });
  readonly activeBinder = computed(() => {
    const id = this.binderFilter();
    return this.binders.binders().find((b) => b.id === id) ?? null;
  });
  readonly unfiledCount = computed(
    () => this.collection.items().filter((i) => !i.binder_id).length,
  );

  readonly filter = signal<Filter>('all');
  readonly query = signal('');

  readonly visible = computed(() => {
    const q = this.query().toLowerCase();
    const f = this.filter();
    const binder = this.binderFilter();
    return this.collection.items().filter((i) => {
      if (binder === 'none' && i.binder_id) return false;
      if (binder !== 'all' && binder !== 'none' && i.binder_id !== binder) return false;
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
    void this.binders.refresh();
    void this.sales.refresh();
  }

  onView(value: string | number | undefined): void {
    if (value === 'cards' || value === 'sold') this.view.set(value);
  }

  async newBinder(): Promise<void> {
    const name = await this.askName('New binder', '');
    if (!name) return;
    try {
      const id = await this.binders.create(name);
      this.binderFilter.set(id);
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.message.set(binderErrorMessage(err));
    }
  }

  async renameBinder(id: string, current: string): Promise<void> {
    const name = await this.askName('Rename binder', current);
    if (!name || name === current) return;
    try {
      await this.binders.rename(id, name);
    } catch (err) {
      this.message.set(binderErrorMessage(err));
    }
  }

  async deleteBinder(id: string, name: string): Promise<void> {
    const alert = await this.alerts.create({
      header: `Delete "${name}"?`,
      message: 'Its cards stay in your Vault, in no binder.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete binder', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;
    await this.binders.remove(id);
    this.binderFilter.set('all');
  }

  async moveTo(change: { ids: string[]; binderId: string | null }): Promise<void> {
    try {
      await this.binders.move(change.ids, change.binderId);
      const n = change.ids.length;
      const target = this.binders.binders().find((b) => b.id === change.binderId)?.name;
      this.message.set(
        `${n} card${n > 1 ? 's' : ''} ${target ? `moved to ${target}` : 'taken out of their binder'}.`,
      );
    } catch (err) {
      this.message.set(binderErrorMessage(err));
    }
  }

  onSold(count: number): void {
    this.sellIds.set(null);
    this.message.set(`${count} sale${count > 1 ? 's' : ''} recorded. See them in Sold.`);
  }

  async undoSale(id: string): Promise<void> {
    try {
      await this.sales.undo(id);
      this.message.set('The card is back in your Vault.');
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.message.set(saleErrorMessage(err));
    }
  }

  /** In-app name prompt (Ionic alert, not a browser dialog). */
  private async askName(header: string, value: string): Promise<string | null> {
    const alert = await this.alerts.create({
      header,
      inputs: [
        {
          name: 'name',
          type: 'text',
          value,
          placeholder: 'PC, For sale, At grading',
          attributes: { maxlength: 40 },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Save', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: { name: string } }>();
    const name = data?.values?.name?.trim() ?? '';
    return role === 'confirm' && name ? name : null;
  }

  async refresh(event?: CustomEvent): Promise<void> {
    try {
      await Promise.all([this.collection.refresh(), this.binders.refresh(), this.sales.refresh()]);
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
  openPaywall(reason: 'gains' | 'sales' = 'gains'): void {
    void this.paywall.open(reason);
  }

  gradeOf(value: string): Grade {
    return value as Grade;
  }
}
