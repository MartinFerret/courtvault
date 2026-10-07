import { checklistPublicSlug } from '@courtvault/shared';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { CatalogService } from '../../core/catalog/catalog.service';
import { CollectionService } from '../../core/collection/collection.service';

type SetCard = Awaited<ReturnType<CatalogService['setCards']>>[number];

@Component({
  selector: 'cv-set-detail',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
  ],
  templateUrl: './set-detail.page.html',
})
export class SetDetailPage {
  private readonly catalog = inject(CatalogService);
  readonly collection = inject(CollectionService);
  readonly slug = input.required<string>();
  readonly set = signal<{
    set_id: string;
    set_name: string;
    season: string;
    total_cards: number;
    owned_cards: number;
  } | null>(null);
  readonly cards = signal<SetCard[]>([]);
  readonly ownedCardIds = computed(() => new Set(this.collection.items().map((i) => i.card_id)));

  constructor() {
    if (this.collection.items().length === 0) void this.collection.refresh();
    effect(() => {
      const slug = this.slug();
      void this.load(slug);
    });
  }

  private async load(slug: string): Promise<void> {
    const sets = await this.catalog.sets();
    const set =
      sets.find((s) => s.set_slug === slug || checklistPublicSlug(s.set_slug) === slug) ?? null;
    this.set.set(set);
    this.cards.set(set ? await this.catalog.setCards(set.set_id) : []);
  }
}
