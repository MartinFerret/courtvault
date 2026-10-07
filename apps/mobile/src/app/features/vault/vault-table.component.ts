import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular';
import { GRADES, PRICE_LABEL, type Grade } from '@courtvault/shared';
import type { CollectionItem } from '../../core/collection/collection.service';
import { ShortcutsService } from '../../core/layout/shortcuts.service';
import {
  CentsPipe,
  DeltaPipe,
  FoilClassPipe,
  FoilHuePipe,
  FoilSatPipe,
  GradePipe,
  ParallelPipe,
} from '../../shared/pipes';

export type SortKey =
  | 'player_name'
  | 'set_name'
  | 'parallel_name'
  | 'grade'
  | 'current_cents'
  | 'change_24h_cents'
  | 'gain_cents';

const GRADE_ORDER: Record<string, number> = { RAW: 0, PSA9: 1, PSA10: 2 };

/**
 * Desktop Vault: a sortable table with multi-select and bulk actions. The phone keeps the
 * list. Rows navigate to the card page; `j`/`k`/Enter work through ShortcutsService.
 */
@Component({
  selector: 'cv-vault-table',
  imports: [
    IonButton,
    IonIcon,
    CentsPipe,
    DeltaPipe,
    GradePipe,
    ParallelPipe,
    FoilClassPipe,
    FoilHuePipe,
    FoilSatPipe,
  ],
  templateUrl: './vault-table.component.html',
})
export class VaultTableComponent {
  private readonly router = inject(Router);
  private readonly shortcuts = inject(ShortcutsService);

  readonly items = input.required<CollectionItem[]>();
  readonly isPremium = input(false);
  readonly changeGrade = output<{ ids: string[]; grade: Grade }>();
  readonly remove = output<string[]>();
  readonly exportCsv = output<void>();
  readonly unlockGains = output<void>();

  readonly priceLabel = PRICE_LABEL;
  readonly grades = GRADES;
  readonly sortKey = signal<SortKey>('current_cents');
  readonly sortDir = signal<'asc' | 'desc'>('desc');
  readonly selected = signal<Set<string>>(new Set());

  readonly columns: { key: SortKey; label: string; numeric?: boolean }[] = [
    { key: 'player_name', label: 'Player' },
    { key: 'set_name', label: 'Set' },
    { key: 'parallel_name', label: 'Parallel' },
    { key: 'grade', label: 'Grade' },
    { key: 'current_cents', label: 'Value', numeric: true },
    { key: 'change_24h_cents', label: '24h', numeric: true },
    { key: 'gain_cents', label: 'Gain / loss', numeric: true },
  ];

  readonly sorted = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...this.items()].sort((a, b) => {
      const va =
        key === 'grade' ? GRADE_ORDER[a.grade ?? 'RAW'] : (a[key] as string | number | null);
      const vb =
        key === 'grade' ? GRADE_ORDER[b.grade ?? 'RAW'] : (b[key] as string | number | null);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return (va < vb ? -1 : 1) * dir;
    });
  });

  readonly allSelected = computed(
    () => this.sorted().length > 0 && this.sorted().every((i) => this.selected().has(i.id ?? '')),
  );
  readonly selectedIds = computed(() => [...this.selected()]);
  readonly activeRow = this.shortcuts.activeRow;

  constructor() {
    effect(() => {
      this.shortcuts.rowCount.set(this.sorted().length);
    });
    this.shortcuts.openRow = (index) => {
      const item = this.sorted()[index];
      if (item) this.open(item);
    };
  }

  sortBy(key: SortKey): void {
    if (this.sortKey() === key) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortKey.set(key);
      this.sortDir.set(
        key === 'player_name' || key === 'set_name' || key === 'parallel_name' ? 'asc' : 'desc',
      );
    }
  }

  toggle(id: string | null, checked: boolean): void {
    if (!id) return;
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  toggleAll(checked: boolean): void {
    this.selected.set(checked ? new Set(this.sorted().map((i) => i.id ?? '')) : new Set());
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  open(item: CollectionItem): void {
    void this.router.navigate(['/card', item.parallel_id], {
      queryParams: { grade: item.grade, item: item.id },
    });
  }

  onChangeGrade(grade: Grade): void {
    this.changeGrade.emit({ ids: this.selectedIds(), grade });
    this.clearSelection();
  }

  onRemove(): void {
    this.remove.emit(this.selectedIds());
    this.clearSelection();
  }

  isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
