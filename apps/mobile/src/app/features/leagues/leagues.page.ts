import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { parseLimitReached } from '@courtvault/shared';
import { GameService, gameErrorMessage } from '../../core/game/game.service';
import { PaywallService } from '../../core/billing/paywall.service';

/** Private leagues: the ones I am in, create one, join one with a code. */
@Component({
  selector: 'cv-leagues',
  imports: [
    FormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './leagues.page.html',
})
export class LeaguesPage {
  readonly game = inject(GameService);
  private readonly paywall = inject(PaywallService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly busy = signal<'create' | 'join' | null>(null);
  readonly error = signal<string | null>(null);
  newName = '';
  code = '';

  constructor() {
    void this.game.loadLeagues().finally(() => this.loading.set(false));
  }

  async create(): Promise<void> {
    if (!this.newName.trim()) return;
    await this.run('create', async () => {
      const league = await this.game.createLeague(this.newName);
      this.newName = '';
      void this.router.navigate(['/leagues', league.id]);
    });
  }

  async join(): Promise<void> {
    if (!this.code.trim()) return;
    await this.run('join', async () => {
      const league = await this.game.joinLeague(this.code);
      this.code = '';
      void this.router.navigate(['/leagues', league.id]);
    });
  }

  private async run(kind: 'create' | 'join', fn: () => Promise<void>): Promise<void> {
    this.busy.set(kind);
    this.error.set(null);
    try {
      await fn();
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.error.set(gameErrorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }
}
