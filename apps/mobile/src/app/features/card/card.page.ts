import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import {
  GRADES,
  PRICE_SOURCE_CREDIT,
  parseLimitReached,
  priceKindLabel,
  type Grade,
} from '@courtvault/shared';
import { AlertsService } from '../../core/alerts/alerts.service';
import { CatalogService, type CardDetail } from '../../core/catalog/catalog.service';
import { CollectionService } from '../../core/collection/collection.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { PlanService } from '../../core/plan/plan.service';
import {
  CentsPipe,
  DeltaPipe,
  GradePipe,
  ParallelPipe,
  FoilClassPipe,
  FoilHuePipe,
  FoilSatPipe,
} from '../../shared/pipes';

/**
 * Card page: price by grade for the selected parallel, history, gain/loss for an owned item,
 * price alert and affiliate buy button. Reached from the Vault (/card/:parallelId) or a
 * deep link (/cards/:slug).
 */
@Component({
  selector: 'cv-card',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonItem,
    IonLabel,
    IonNote,
    IonIcon,
    IonInput,
    SlicePipe,
    CentsPipe,
    DeltaPipe,
    ParallelPipe,
    GradePipe,
    FoilClassPipe,
    FoilHuePipe,
    FoilSatPipe,
  ],
  templateUrl: './card.page.html',
})
export class CardPage {
  private readonly catalog = inject(CatalogService);
  readonly collection = inject(CollectionService);
  readonly alerts = inject(AlertsService);
  readonly plan = inject(PlanService);
  private readonly paywall = inject(PaywallService);

  // Route inputs (withComponentInputBinding): one of slug / parallelId, plus query params.
  readonly slug = input<string>();
  readonly parallelId = input<string>();
  readonly grade = input<string>();
  readonly item = input<string>();
  /** From the website: "Add to my Vault" (kept through sign-up). */
  readonly action = input<string>();

  readonly sourceCredit = PRICE_SOURCE_CREDIT;
  readonly grades = GRADES;

  /** "Recent auction sales", "Last auction sale, Oct 2" or "Current asking price". */
  kindLabel(p: { price_kind: string; sale_at: string | null }): string {
    return priceKindLabel(p.price_kind, p.sale_at);
  }
  countLabel(p: { price_kind: string; sample_size: number }): string {
    const unit = p.price_kind === 'ask_median' ? 'listing' : 'sale';
    return `${p.sample_size} ${unit}${p.sample_size === 1 ? '' : 's'}`;
  }
  readonly card = signal<CardDetail | null>(null);
  readonly selectedParallelId = signal<string | null>(null);
  readonly selectedGrade = signal<Grade>('RAW');
  readonly history = signal<{ captured_at: string; price_cents: number }[]>([]);
  readonly error = signal<string | null>(null);
  alertUsd: number | null = null;

  readonly parallel = computed(
    () => this.card()?.parallels.find((p) => p.id === this.selectedParallelId()) ?? null,
  );
  readonly price = computed(() => this.parallel()?.prices[this.selectedGrade()] ?? null);
  readonly ownedItem = computed(() => {
    const id = this.item();
    return id ? (this.collection.items().find((i) => i.id === id) ?? null) : null;
  });
  readonly gain = computed(() => {
    const it = this.ownedItem();
    const price = this.price();
    if (!it || it.purchase_cents === null || !price) return null;
    return price.price_cents - it.purchase_cents;
  });
  readonly activeAlert = computed(() => {
    const pid = this.selectedParallelId();
    return pid ? this.alerts.forParallel(pid, this.selectedGrade()) : undefined;
  });
  readonly historyMin = computed(() =>
    Math.min(...this.history().map((h) => h.price_cents), Infinity),
  );
  readonly historyMax = computed(() =>
    Math.max(...this.history().map((h) => h.price_cents), -Infinity),
  );
  readonly historyDelta = computed(() => {
    const h = this.history();
    return h.length > 1 ? h[h.length - 1]!.price_cents - h[0]!.price_cents : null;
  });

  constructor() {
    void this.plan.load();
    void this.alerts.refresh();
    if (this.collection.items().length === 0) void this.collection.refresh();
    effect(() => {
      const slug = this.slug();
      const parallelId = this.parallelId();
      const grade = this.grade();
      void this.load(slug, parallelId, grade);
    });
    effect(() => {
      const pid = this.selectedParallelId();
      const g = this.selectedGrade();
      if (pid) void this.catalog.priceHistory(pid, g).then((h) => this.history.set(h));
    });
  }

  private async load(slug?: string, parallelId?: string, grade?: string): Promise<void> {
    this.error.set(null);
    try {
      const card = slug
        ? await this.catalog.cardBySlug(slug)
        : parallelId
          ? await this.catalog.cardByParallelId(parallelId)
          : null;
      this.card.set(card);
      if (!card) return;
      this.selectedParallelId.set(
        parallelId && card.parallels.some((p) => p.id === parallelId)
          ? parallelId
          : (card.parallels[0]?.id ?? null),
      );
      if (grade && (GRADES as readonly string[]).includes(grade))
        this.selectedGrade.set(grade as Grade);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the card.');
    }
  }

  onGrade(value: string | number | undefined): void {
    if (typeof value === 'string' && (GRADES as readonly string[]).includes(value))
      this.selectedGrade.set(value as Grade);
  }

  async addToVault(): Promise<void> {
    const pid = this.selectedParallelId();
    if (!pid) return;
    try {
      await this.collection.add({ parallelId: pid, grade: this.selectedGrade() });
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.error.set(err instanceof Error ? err.message : 'Could not add the card.');
    }
  }

  async setAlert(): Promise<void> {
    const pid = this.selectedParallelId();
    if (!pid || !this.alertUsd) return;
    try {
      await this.alerts.create(pid, this.selectedGrade(), Math.round(this.alertUsd * 100));
      this.alertUsd = null;
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.error.set(err instanceof Error ? err.message : 'Could not create the alert.');
    }
  }

  removeAlert(id: string): void {
    void this.alerts.remove(id);
  }

  openPaywall(reason: string): void {
    void this.paywall.open(reason);
  }

  /** Tiny inline sparkline: SVG points scaled to a 100x30 box. */
  sparkline(): string {
    const h = this.history();
    if (h.length < 2) return '';
    const min = this.historyMin();
    const max = this.historyMax();
    const span = max - min || 1;
    return h
      .map(
        (p, i) => `${(i / (h.length - 1)) * 100},${30 - ((p.price_cents - min) / span) * 28 - 1}`,
      )
      .join(' ');
  }
}
