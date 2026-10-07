import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { GRADES, formatParallel, type Grade } from '@courtvault/shared';
import { PaywallService } from '../../core/billing/paywall.service';
import { CollectionService } from '../../core/collection/collection.service';
import {
  IMPORT_FIELDS,
  ImportService,
  summarize,
  type ColumnMapping,
  type ImportCandidate,
  type ImportField,
  type ParsedCsv,
} from '../../core/import/import.service';
import { PlanService } from '../../core/plan/plan.service';
import { CentsPipe, GradePipe } from '../../shared/pipes';

type Step = 'upload' | 'map' | 'preview' | 'done';

const FIELD_LABELS: Record<ImportField, string> = {
  player: 'Player',
  set: 'Set',
  season: 'Season',
  number: 'Card number',
  parallel: 'Parallel',
  grade: 'Grade',
  serial: 'Serial number',
  price: 'Purchase price',
  quantity: 'Quantity',
};

/**
 * Import a spreadsheet: upload a CSV, map the columns, review the matches, confirm.
 * Unmatched rows go to a review list the user can resolve later from this page.
 */
@Component({
  selector: 'cv-import',
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonIcon,
    IonNote,
    CentsPipe,
    GradePipe,
  ],
  templateUrl: './import.page.html',
})
export class ImportPage {
  readonly importer = inject(ImportService);
  readonly plan = inject(PlanService);
  private readonly collection = inject(CollectionService);
  private readonly paywall = inject(PaywallService);

  readonly fields = IMPORT_FIELDS;
  readonly fieldLabels = FIELD_LABELS;
  readonly grades = GRADES;
  readonly step = signal<Step>('upload');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly fileName = signal('');
  readonly parsed = signal<ParsedCsv | null>(null);
  readonly mapping = signal<ColumnMapping>({});
  readonly candidates = signal<ImportCandidate[]>([]);
  readonly result = signal<{
    inserted: number;
    skipped: number;
    limitReached: boolean;
    reviewsSaved: number;
  } | null>(null);
  readonly dragging = signal(false);

  readonly counts = computed(() => {
    const list = this.candidates();
    return {
      add: list.filter((c) => c.action === 'add').length,
      review: list.filter((c) => c.action === 'review').length,
      skip: list.filter((c) => c.action === 'skip').length,
      copies: list.filter((c) => c.action === 'add').reduce((n, c) => n + c.quantity, 0),
    };
  });
  readonly cardLimit = computed(() => this.plan.limitFor('cards'));
  readonly previewRows = computed(() => this.parsed()?.rows.slice(0, 3) ?? []);

  constructor() {
    void this.plan.load();
    void this.importer.loadReviews().catch(() => undefined);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.load(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onFileInput(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void this.load(file);
  }

  async load(file: File): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      const parsed = await this.importer.parse(file);
      this.fileName.set(file.name);
      this.parsed.set(parsed);
      this.mapping.set(this.importer.autoMap(parsed.headers));
      this.step.set('map');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not read the file.');
    } finally {
      this.busy.set(false);
    }
  }

  setMapping(field: ImportField, header: string): void {
    this.mapping.update((m) => ({ ...m, [field]: header || undefined }));
  }

  async runMatch(): Promise<void> {
    const parsed = this.parsed();
    if (!parsed) return;
    if (!this.mapping().player) {
      this.error.set('Pick the column that holds the player name.');
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    try {
      const { matchInput, parsedRows } = this.importer.prepare(parsed, this.mapping());
      const matches = await this.importer.match(matchInput);
      this.candidates.set(
        matches.map((match) => {
          const local = parsedRows[match.row_index ?? 0]!;
          return {
            index: match.row_index ?? 0,
            raw: parsed.rows[match.row_index ?? 0] ?? {},
            match,
            parallelId: match.parallel_id ?? null,
            grade: local.grade,
            serialNumber: local.serialNumber,
            purchaseCents: local.purchaseCents,
            quantity: local.quantity,
            action:
              match.status === 'matched' ? 'add' : match.status === 'ambiguous' ? 'add' : 'review',
          };
        }),
      );
      this.step.set('preview');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Matching failed.');
    } finally {
      this.busy.set(false);
    }
  }

  update(index: number, patch: Partial<ImportCandidate>): void {
    this.candidates.update((list) => list.map((c) => (c.index === index ? { ...c, ...patch } : c)));
  }

  parallelsOf(c: ImportCandidate): { id: string; name: string; serial_run: number | null }[] {
    return (
      (c.match.parallels as { id: string; name: string; serial_run: number | null }[] | null) ?? []
    );
  }

  parallelLabel(p: { name: string; serial_run: number | null }): string {
    return formatParallel(p.name, p.serial_run);
  }

  rawSummary(c: ImportCandidate): string {
    return summarize(c.raw);
  }

  async confirm(): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      const result = await this.importer.confirm(this.candidates());
      this.result.set(result);
      this.step.set('done');
      await Promise.all([this.collection.refresh(), this.importer.loadReviews()]);
      if (result.limitReached) void this.paywall.open('cards');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      this.busy.set(false);
    }
  }

  reset(): void {
    this.step.set('upload');
    this.parsed.set(null);
    this.candidates.set([]);
    this.result.set(null);
    this.fileName.set('');
  }

  onGrade(index: number, value: string): void {
    if ((GRADES as readonly string[]).includes(value))
      this.update(index, { grade: value as Grade });
  }

  onNumber(index: number, key: 'serialNumber' | 'purchaseCents' | 'quantity', value: string): void {
    const n = Number.parseFloat(value);
    if (key === 'purchaseCents')
      this.update(index, { purchaseCents: Number.isFinite(n) ? Math.round(n * 100) : null });
    else if (key === 'quantity')
      this.update(index, {
        quantity: Number.isFinite(n) && n >= 1 ? Math.min(50, Math.round(n)) : 1,
      });
    else this.update(index, { serialNumber: Number.isFinite(n) && n > 0 ? Math.round(n) : null });
  }

  valueOf(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  reviewSummary(raw: unknown): string {
    if (!raw || typeof raw !== 'object') return '';
    const record = raw as Record<string, string>;
    return record['_summary'] ?? summarize(record);
  }

  deleteReview(id: string): void {
    void this.importer.deleteReview(id);
  }
}
