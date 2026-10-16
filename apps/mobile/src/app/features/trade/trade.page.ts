import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { GRADES, priceKindLabel, type Grade } from '@courtvault/shared';
import {
  CatalogService,
  type CardDetail,
  type SearchResult,
} from '../../core/catalog/catalog.service';
import { CollectionService, type CollectionItem } from '../../core/collection/collection.service';
import {
  TRADE_MAX_PER_SIDE,
  TradeService,
  verdictLabel,
  type TradePick,
  type TradeResult,
  type TradeSide,
} from '../../core/trade/trade.service';
import { shareErrorMessage } from '../../core/share/share.service';
import { CentsPipe, DeltaPipe, GradePipe, ParallelPipe } from '../../shared/pipes';

interface PickRow extends TradePick {
  key: number;
  label: string;
  detail: string;
}

/**
 * Trade analyzer: "You give" against "You get" at market value. Cards come from the Vault (give
 * side) or the catalog search (both sides). The figures come from trade_value() only; this page
 * never adds prices itself.
 */
@Component({
  selector: 'cv-trade',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    CentsPipe,
    DeltaPipe,
    GradePipe,
    ParallelPipe,
  ],
  templateUrl: './trade.page.html',
})
export class TradePage {
  private readonly catalog = inject(CatalogService);
  readonly collection = inject(CollectionService);
  private readonly trades = inject(TradeService);

  readonly grades = GRADES;
  readonly max = TRADE_MAX_PER_SIDE;

  readonly picks = signal<PickRow[]>([]);
  readonly activeSide = signal<TradeSide>('give');
  readonly query = signal('');
  readonly results = signal<SearchResult[]>([]);
  readonly searching = signal(false);
  readonly card = signal<CardDetail | null>(null);
  readonly cardParallelId = signal<string | null>(null);
  readonly cardGrade = signal<Grade>('RAW');

  readonly result = signal<TradeResult | null>(null);
  readonly analyzing = signal(false);
  readonly note = signal<string | null>(null);

  readonly give = computed(() => this.picks().filter((p) => p.side === 'give'));
  readonly get = computed(() => this.picks().filter((p) => p.side === 'get'));
  readonly sideFull = computed(
    () => (this.activeSide() === 'give' ? this.give() : this.get()).length >= TRADE_MAX_PER_SIDE,
  );
  /** Vault cards matching the search, offered first on the give side. */
  readonly vaultMatches = computed(() => {
    if (this.activeSide() !== 'give') return [];
    const q = this.query().trim().toLowerCase();
    return this.collection
      .items()
      .filter(
        (i) =>
          !q ||
          `${i.player_name} ${i.set_name} ${i.parallel_name} ${i.card_number}`
            .toLowerCase()
            .includes(q),
      )
      .slice(0, 8);
  });
  readonly verdict = computed(() => {
    const r = this.result();
    return r ? verdictLabel(r) : null;
  });

  private nextKey = 1;
  private searchToken = 0;
  private analyzeToken = 0;

  constructor() {
    if (this.collection.items().length === 0) void this.collection.refresh();
    effect(() => {
      const picks = this.picks();
      void this.analyze(picks);
    });
  }

  setSide(value: string | number | undefined): void {
    if (value === 'give' || value === 'get') {
      this.activeSide.set(value);
      this.card.set(null);
    }
  }

  async search(q: string): Promise<void> {
    this.query.set(q);
    this.card.set(null);
    const token = ++this.searchToken;
    if (!q.trim()) {
      this.results.set([]);
      return;
    }
    this.searching.set(true);
    try {
      const found = await this.catalog.search(q);
      if (token === this.searchToken) this.results.set(found.filter((r) => r.kind === 'card'));
    } finally {
      if (token === this.searchToken) this.searching.set(false);
    }
  }

  async openCard(result: SearchResult): Promise<void> {
    const card = await this.catalog.cardById(result.id);
    this.card.set(card);
    this.cardParallelId.set(card?.parallels[0]?.id ?? null);
    this.cardGrade.set('RAW');
  }

  addFromVault(item: CollectionItem): void {
    if (!item.parallel_id) return;
    this.push({
      side: 'give',
      parallelId: item.parallel_id,
      grade: (item.grade ?? 'RAW') as Grade,
      label: `#${item.card_number} ${item.player_name}`,
      detail: `${item.season} ${item.set_name}`,
    });
  }

  addFromCard(): void {
    const card = this.card();
    const pid = this.cardParallelId();
    if (!card || !pid) return;
    this.push({
      side: this.activeSide(),
      parallelId: pid,
      grade: this.cardGrade(),
      label: `#${card.number} ${card.player.name}`,
      detail: `${card.set.season} ${card.set.name}`,
    });
    this.card.set(null);
  }

  remove(key: number): void {
    this.picks.update((list) => list.filter((p) => p.key !== key));
  }

  onParallel(value: unknown): void {
    if (typeof value === 'string') this.cardParallelId.set(value);
  }

  onGrade(value: string | number | undefined): void {
    if (typeof value === 'string' && (GRADES as readonly string[]).includes(value))
      this.cardGrade.set(value as Grade);
  }

  /** Line under a priced card in the result: "Recent auction sales" and so on. */
  kindLabel(kind: string | null, saleAt: string | null): string {
    return kind ? priceKindLabel(kind, saleAt) : 'No market price yet';
  }

  async share(): Promise<void> {
    this.note.set(null);
    try {
      const how = await this.trades.share(this.picks());
      this.note.set(
        how === 'copied' ? 'Link copied. Paste it wherever the trade is discussed.' : null,
      );
    } catch (err) {
      this.note.set(shareErrorMessage(err));
    }
  }

  private push(row: Omit<PickRow, 'key'>): void {
    const count = this.picks().filter((p) => p.side === row.side).length;
    if (count >= TRADE_MAX_PER_SIDE) {
      this.note.set(`Up to ${TRADE_MAX_PER_SIDE} cards per side.`);
      return;
    }
    this.note.set(null);
    this.picks.update((list) => [...list, { ...row, key: this.nextKey++ }]);
  }

  private async analyze(picks: PickRow[]): Promise<void> {
    const token = ++this.analyzeToken;
    if (!picks.some((p) => p.side === 'give') || !picks.some((p) => p.side === 'get')) {
      this.result.set(null);
      return;
    }
    this.analyzing.set(true);
    try {
      const result = await this.trades.analyze(picks);
      if (token === this.analyzeToken) this.result.set(result);
    } catch (err) {
      if (token === this.analyzeToken)
        this.note.set(err instanceof Error ? err.message : 'Could not value this trade.');
    } finally {
      if (token === this.analyzeToken) this.analyzing.set(false);
    }
  }
}
