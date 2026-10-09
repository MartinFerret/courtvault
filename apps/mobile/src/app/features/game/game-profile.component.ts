import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonToggle } from '@ionic/angular';
import { GameService, gameErrorMessage, type Badge } from '../../core/game/game.service';
import { ShareService } from '../../core/share/share.service';

const BADGE_LABELS: Record<Badge['kind'], string> = {
  weekly_winner: 'Weekly winner',
  perfect_captain: 'Perfect captain',
  club_200: '200 club',
  iron_five: 'Iron five',
};

/** Profile section for the game: username (the only public identity), ranking opt-out, badges. */
@Component({
  selector: 'cv-game-profile',
  imports: [FormsModule, IonButton, IonIcon, IonToggle],
  template: `
    <section class="cv-section" aria-labelledby="game-profile-title">
      <h2 id="game-profile-title">Vault Score</h2>
      <p class="cv-caption" style="margin: 6px 0 12px">
        Rankings show this username, never your email.
      </p>
      <form class="cv-quickadd__examples" style="margin: 0" (ngSubmit)="save()">
        <label class="cv-visually-hidden" for="game-username">Username</label>
        <input
          id="game-username"
          name="username"
          class="cv-username-input"
          [(ngModel)]="username"
          placeholder="Pick a username"
          maxlength="20"
          autocomplete="nickname"
        />
        <ion-button type="submit" [disabled]="busy() || username.trim().length < 3">{{
          saved() ? 'Saved' : 'Save'
        }}</ion-button>
      </form>
      @if (error()) {
        <p class="cv-error" role="alert" style="margin-top: 8px">{{ error() }}</p>
      }
      <ion-toggle
        style="margin-top: 16px; width: 100%"
        [checked]="optOut()"
        (ionChange)="setOptOut($any($event).detail.checked)"
        justify="space-between"
        >Hide me from the global ranking</ion-toggle
      >
      <ion-button fill="outline" style="margin-top: 16px" (click)="invite()">
        <ion-icon slot="start" name="share-outline" aria-hidden="true"></ion-icon
        >{{ inviteNote() ?? 'Invite friends' }}
      </ion-button>
      @if (badges().length > 0) {
        <h3 style="margin-top: 20px; font: var(--cv-text-heading)">Badges</h3>
        <ul class="cv-badges">
          @for (b of badges(); track b.kind + b.period_key + (b.league ?? '')) {
            <li>
              <ion-icon
                [name]="b.kind === 'weekly_winner' ? 'trophy' : 'flame'"
                aria-hidden="true"
              ></ion-icon
              >{{ label(b) }}
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class GameProfileComponent {
  private readonly game = inject(GameService);
  private readonly sharing = inject(ShareService);
  readonly inviteNote = signal<string | null>(null);

  /** Personal link to hoopticker.com/r/<code>: friends see what HoopTicker is, then sign up. */
  async invite(): Promise<void> {
    try {
      const url = await this.sharing.referralUrl();
      const how = await this.sharing.send(
        'HoopTicker',
        url,
        'Track your basketball cards and play Vault Score with me.',
      );
      this.inviteNote.set(how === 'copied' ? 'Invite link copied' : null);
    } catch {
      this.inviteNote.set('Could not create the link');
    }
  }
  username = '';
  readonly optOut = signal(false);
  readonly badges = signal<Badge[]>([]);
  readonly busy = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.game
      .profile()
      .then((p) => {
        this.username = p.username ?? '';
        this.optOut.set(p.ranking_opt_out);
      })
      .catch(() => null);
    void this.game
      .badges()
      .then((b) => this.badges.set(b ?? []))
      .catch(() => null);
  }

  async save(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.username = await this.game.setUsername(this.username);
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2000);
    } catch (err) {
      this.error.set(gameErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async setOptOut(value: boolean): Promise<void> {
    this.optOut.set(await this.game.setRankingOptOut(value));
  }

  label(b: Badge): string {
    const when = new Date(`${b.period_key}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const scope = b.league ? `, ${b.league}` : '';
    return `${BADGE_LABELS[b.kind]}${b.kind === 'weekly_winner' ? ', week of ' : ', '}${when}${scope}`;
  }
}
