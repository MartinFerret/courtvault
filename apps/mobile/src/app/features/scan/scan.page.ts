import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonList,
  IonNote, IonSearchbar, IonSegment, IonSegmentButton, IonSpinner,
} from '@ionic/angular';
import { GRADES, formatParallel, parseLimitReached, type Grade } from '@courtvault/shared';
import { CatalogService, type SearchResult } from '../../core/catalog/catalog.service';
import { CollectionService } from '../../core/collection/collection.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { PushService } from '../../core/push/push.service';
import { ScanService, type CapturedPhoto, type ScanCandidate } from '../../core/scan/scan.service';
import { CentsPipe, GradePipe, ParallelPipe } from '../../shared/pipes';

type Step = 'idle' | 'scanning' | 'pick-card' | 'pick-parallel' | 'no-match';

/**
 * Scan: photo -> OCR -> scan-match -> card -> parallel grid -> add. Burst mode keeps the
 * session open with a running count and total value. Manual search is the fallback.
 */
@Component({
  selector: 'cv-scan',
  imports: [
    FormsModule, IonButton, IonContent, IonIcon, IonList, IonItem, IonLabel,
    IonNote, IonSearchbar, IonSegment, IonSegmentButton, IonSpinner, IonInput, CentsPipe, ParallelPipe, GradePipe,
  ],
  templateUrl: './scan.page.html',
})
export class ScanPage {
  readonly scan = inject(ScanService);
  readonly collection = inject(CollectionService);
  private readonly catalog = inject(CatalogService);
  private readonly paywall = inject(PaywallService);
  private readonly push = inject(PushService);
  private readonly router = inject(Router);

  readonly grades = GRADES;
  readonly step = signal<Step>('idle');
  readonly candidates = signal<ScanCandidate[]>([]);
  readonly selected = signal<ScanCandidate | null>(null);
  readonly photo = signal<CapturedPhoto | null>(null);
  readonly ocrText = signal('');
  readonly error = signal<string | null>(null);
  readonly serialRead = signal<number | null>(null);

  grade: Grade = 'RAW';
  serialNumber: number | null = null;
  purchaseUsd: number | null = null;

  // Burst session
  readonly sessionCount = signal(0);
  readonly sessionCents = signal(0);
  readonly sessionItems = signal<{ label: string; cents: number | null }[]>([]);

  // Manual search fallback
  readonly manualQuery = signal('');
  readonly manualResults = signal<SearchResult[]>([]);
  readonly manualBusy = signal(false);

  readonly selectedParallels = computed(() => this.selected()?.parallels ?? []);

  async start(): Promise<void> {
    this.error.set(null);
    this.step.set('scanning');
    try {
      const photo = await this.scan.capture();
      this.photo.set(photo);
      const text = await this.scan.recognize(photo);
      this.ocrText.set(text);
      if (!text.trim()) {
        // OCR read nothing (blurry photo, no text): no server call, offer manual search.
        this.candidates.set([]);
        this.step.set('no-match');
        return;
      }
      const result = await this.scan.match(text);
      this.serialRead.set(result.signals.serial?.number ?? null);
      this.serialNumber = result.signals.serial?.number ?? null;
      this.candidates.set(result.candidates);
      if (result.candidates.length === 0) {
        this.step.set('no-match');
      } else if (result.candidates.length === 1 || (result.candidates[0]?.score ?? 0) >= 80) {
        this.pickCard(result.candidates[0]!);
      } else {
        this.step.set('pick-card');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Scan failed.');
      this.step.set('no-match');
    }
  }

  pickCard(candidate: ScanCandidate): void {
    this.selected.set(candidate);
    this.step.set('pick-parallel');
  }

  async addParallel(parallelId: string, label: string): Promise<void> {
    this.error.set(null);
    try {
      const item = await this.collection.add({
        parallelId,
        grade: this.grade,
        serialNumber: this.serialNumber,
        purchaseCents: this.purchaseUsd === null ? null : Math.round(this.purchaseUsd * 100),
        photo: this.photo()?.thumbnail ?? null,
      });
      this.sessionCount.update((n) => n + 1);
      this.sessionCents.update((c) => c + (item.current_cents ?? 0));
      this.sessionItems.update((list) => [{ label, cents: item.current_cents }, ...list].slice(0, 20));
      await this.push.requestAfterFirstScan();
      this.resetForNext();
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) {
        void this.paywall.open(limit.key);
        return;
      }
      this.error.set(err instanceof Error ? err.message : 'Could not add the card.');
    }
  }

  resetForNext(): void {
    this.selected.set(null);
    this.candidates.set([]);
    this.photo.set(null);
    this.serialNumber = null;
    this.purchaseUsd = null;
    this.step.set('idle');
  }

  async manualSearch(query: string): Promise<void> {
    this.manualQuery.set(query);
    if (query.trim().length < 2) {
      this.manualResults.set([]);
      return;
    }
    this.manualBusy.set(true);
    try {
      this.manualResults.set((await this.catalog.search(query)).filter((r) => r.kind === 'card'));
    } finally {
      this.manualBusy.set(false);
    }
  }

  async pickManual(result: SearchResult): Promise<void> {
    if (!result.id) return;
    const card = await this.catalog.cardById(result.id);
    if (!card) return;
    this.pickCard({
      card: {
        id: card.id, slug: card.slug, number: card.number, isRookie: card.is_rookie, playerId: card.player.id,
        playerName: card.player.name, setId: card.set.id, setName: card.set.name, setSlug: card.set.slug, season: card.set.season,
      },
      score: 0,
      reasons: ['manual'],
      parallels: card.parallels.map((p) => ({ id: p.id, name: p.name, serialRun: p.serial_run })),
    });
  }

  finish(): void {
    this.resetForNext();
    this.sessionCount.set(0);
    this.sessionCents.set(0);
    this.sessionItems.set([]);
    void this.router.navigateByUrl('/tabs/vault');
  }

  labelFor(c: ScanCandidate, p: { name: string; serialRun: number | null }): string {
    return `#${c.card.number} ${c.card.playerName} ${formatParallel(p.name, p.serialRun)}`;
  }

  onGrade(value: string | number | undefined): void {
    if (typeof value === 'string' && (GRADES as readonly string[]).includes(value)) this.grade = value as Grade;
  }
}
