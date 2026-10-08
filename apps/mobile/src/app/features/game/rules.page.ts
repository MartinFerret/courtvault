import { Component, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AFFILIATION_DISCLAIMER } from '@courtvault/shared';
import { GameService, type ScoringWeight } from '../../core/game/game.service';

const STAT_LABELS: Record<string, string> = {
  points: 'Point',
  rebounds: 'Rebound',
  assists: 'Assist',
  steals: 'Steal',
  blocks: 'Block',
  turnovers: 'Turnover',
};

/** How Vault Score works, inside the app. The public page lives on the website. */
@Component({
  selector: 'cv-game-rules',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
  templateUrl: './rules.page.html',
})
export class RulesPage {
  private readonly game = inject(GameService);
  readonly weights = signal<ScoringWeight[]>([]);
  readonly disclaimer = AFFILIATION_DISCLAIMER;
  readonly labels = STAT_LABELS;
  readonly order = ['points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers'];

  constructor() {
    void this.game
      .scoring()
      .then((w) =>
        this.weights.set(w.sort((a, b) => this.order.indexOf(a.stat) - this.order.indexOf(b.stat))),
      );
  }

  format(weight: number): string {
    return weight > 0 ? `+${weight}` : `${weight}`;
  }
}
