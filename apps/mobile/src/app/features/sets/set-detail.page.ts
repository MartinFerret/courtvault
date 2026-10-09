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

import { FollowsService } from '../../core/follows/follows.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { parseLimitReached } from '@courtvault/shared';

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
  /** From the website: "Follow this set" (kept through sign-up). */
  readonly action = input<string>();
  private readonly follows = inject(FollowsService);
  private readonly paywall = inject(PaywallService);
  readonly followNote = signal<string | null>(null);
  private followHandled = false;
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
    if (set && this.action() === 'follow' && !this.followHandled) {
      this.followHandled = true;
      await this.follow(set.set_id, set.set_name);
    }
  }

  private async follow(setId: string, name: string): Promise<void> {
    try {
      await this.follows.refresh();
      if (!this.follows.setIds().has(setId)) await this.follows.followSet(setId);
      this.followNote.set(`You follow ${name}. Its checklist progress is in Sets.`);
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.followNote.set('Could not follow this set. Try again from Sets.');
    }
  }
}
