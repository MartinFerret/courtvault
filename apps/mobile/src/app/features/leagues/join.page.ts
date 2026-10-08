import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { parseLimitReached } from '@courtvault/shared';
import { GameService, gameErrorMessage } from '../../core/game/game.service';
import { PaywallService } from '../../core/billing/paywall.service';

/** Invite link target (/leagues/join/:code): joins, then opens the league. */
@Component({
  selector: 'cv-league-join',
  imports: [RouterLink, IonContent, IonButton, IonSpinner],
  template: `
    <ion-content class="cv-arena">
      <div class="cv-arena-body" style="padding-top: 40px">
        @if (error(); as e) {
          <div class="cv-arena-panel">
            <h2>Could not join</h2>
            <p class="cv-caption" style="margin-top: 6px">{{ e }}</p>
            <ion-button routerLink="/leagues" style="margin-top: 14px">Go to leagues</ion-button>
          </div>
        } @else {
          <ion-spinner aria-label="Joining the league"></ion-spinner>
        }
      </div>
    </ion-content>
  `,
})
export class LeagueJoinPage {
  private readonly game = inject(GameService);
  private readonly paywall = inject(PaywallService);
  readonly error = signal<string | null>(null);

  constructor() {
    const code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';
    const router = inject(Router);
    this.game
      .joinLeague(code)
      .then((l) => router.navigate(['/leagues', l.id], { replaceUrl: true }))
      .catch((err) => {
        const limit = parseLimitReached(err);
        if (limit) void this.paywall.open(limit.key);
        this.error.set(
          limit ? 'The free plan includes one private league.' : gameErrorMessage(err),
        );
      });
  }
}
