import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonProgressBar,
  IonButton,
} from '@ionic/angular';
import { parseLimitReached } from '@courtvault/shared';
import { CatalogService } from '../../core/catalog/catalog.service';
import { FollowsService } from '../../core/follows/follows.service';
import { PaywallService } from '../../core/billing/paywall.service';

type SetRow = Awaited<ReturnType<CatalogService['sets']>>[number];

@Component({
  selector: 'cv-sets',
  imports: [
    RouterLink,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonIcon,
    IonProgressBar,
    IonButton,
  ],
  templateUrl: './sets.page.html',
})
export class SetsPage {
  private readonly catalog = inject(CatalogService);
  readonly follows = inject(FollowsService);
  private readonly paywall = inject(PaywallService);
  readonly sets = signal<SetRow[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    await this.follows.refresh();
    this.sets.set(await this.catalog.sets());
  }

  async toggle(set: SetRow, event: Event): Promise<void> {
    // The row is a router link (Ionic renders it as an anchor): stopping the bubble is not
    // enough, the anchor's own navigation has to be cancelled too.
    event.stopPropagation();
    event.preventDefault();
    this.error.set(null);
    try {
      if (set.is_followed) await this.follows.unfollowSet(set.set_id);
      else await this.follows.followSet(set.set_id);
      await this.load();
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.error.set(err instanceof Error ? err.message : 'Could not update.');
    }
  }

  followed(): SetRow[] {
    return this.sets().filter((s) => s.is_followed);
  }
  others(): SetRow[] {
    return this.sets().filter((s) => !s.is_followed);
  }
}
