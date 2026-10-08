import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular';
import { parseLimitReached } from '@courtvault/shared';
import {
  GameService,
  gameErrorMessage,
  type RosterPlayer,
  type Standings,
} from '../../core/game/game.service';
import { PaywallService } from '../../core/billing/paywall.service';
import { FoilClassPipe, FoilHuePipe, FoilSatPipe } from '../../shared/pipes';
import { CourtComponent, SPOTS } from './court.component';
import { ScoreboardComponent } from './scoreboard.component';

type Slots = (RosterPlayer | null)[];

/**
 * Vault Score: the lineup court, the jumbotron and the bench. Every rule (ownership,
 * eligibility, lock, rate limit) is checked by set_lineup(); this page only arranges players.
 */
@Component({
  selector: 'cv-game',
  imports: [
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    CourtComponent,
    ScoreboardComponent,
    FoilClassPipe,
    FoilHuePipe,
    FoilSatPipe,
  ],
  templateUrl: './game.page.html',
})
export class GamePage {
  readonly game = inject(GameService);
  private readonly paywall = inject(PaywallService);

  readonly loading = signal(true);
  readonly slots = signal<Slots>([null, null, null, null, null]);
  readonly captainId = signal<string | null>(null);
  readonly selected = signal<number | null>(null);
  readonly picked = signal<string | null>(null);
  readonly seated = signal<number | null>(null);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly editTomorrow = signal(false);
  readonly standings = signal<Standings | null>(null);
  readonly username = signal<string | null>(null);
  /** Polite announcement of what changed on the court (tap or drop), for screen readers. */
  readonly announce = signal('');

  readonly state = this.game.lineup;
  readonly roster = computed(() => this.state()?.roster ?? []);
  readonly rosterById = computed(() => new Map(this.roster().map((p) => [p.player_id, p])));
  readonly onCourt = computed(
    () =>
      new Set(
        this.slots()
          .filter((s): s is RosterPlayer => !!s)
          .map((s) => s.player_id),
      ),
  );
  readonly filled = computed(() => this.onCourt().size);

  /** Tonight's lineup is frozen once the first game tips off; edits then apply to tomorrow. */
  readonly lockedTonight = computed(() => {
    const s = this.state();
    return !!s && s.today_locked && s.locked?.game_day === s.today;
  });
  readonly viewingLocked = computed(() => this.lockedTonight() && !this.editTomorrow());
  readonly lockedSlots = computed<Slots>(() => {
    const locked = this.state()?.locked;
    if (!locked) return [null, null, null, null, null];
    return locked.player_ids.map((id) => (id ? (this.rosterById().get(id) ?? null) : null));
  });

  readonly dirty = computed(() => {
    const draft = this.state()?.draft;
    const ids = this.slots().map((s) => s?.player_id ?? null);
    if (!draft) return ids.some((id) => id !== null);
    return draft.captain_id !== this.captainId() || draft.player_ids.some((id, i) => id !== ids[i]);
  });
  readonly canSave = computed(
    () => this.filled() === 5 && !!this.captainId() && this.dirty() && !this.saving(),
  );
  readonly pendingNames = computed(() =>
    this.slots()
      .filter((s): s is RosterPlayer => !!s && !s.eligible)
      .map((s) => s.name),
  );
  readonly selectedPlayer = computed(() => {
    const i = this.selected();
    return i === null ? null : (this.slots()[i] ?? null);
  });

  readonly lastScore = computed(() => this.game.scores()?.days[0] ?? null);
  readonly noGamesTonight = computed(() => {
    const s = this.state();
    return !!s && s.next_day !== s.today && !s.today_locked;
  });
  readonly me = computed(() => this.standings()?.me ?? null);

  readonly saveHint = computed(() => {
    if (this.filled() < 5) return `${this.filled()} of 5 players on the court.`;
    if (!this.captainId()) return 'Pick a captain: tap a player, then Make captain.';
    if (!this.dirty()) return this.lockedTonight() ? 'Saved for tomorrow.' : 'Lineup saved.';
    return this.lockedTonight() ? 'Changes apply to tomorrow.' : 'Not saved yet.';
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [state] = await Promise.all([
        this.game.loadLineup(),
        this.game.loadScores(7).catch(() => null),
        this.game
          .standings('global', 'week')
          .then((s) => this.standings.set(s))
          .catch(() => null),
        this.game
          .profile()
          .then((p) => this.username.set(p.username))
          .catch(() => null),
      ]);
      const byId = new Map(state.roster.map((p) => [p.player_id, p]));
      if (state.draft) {
        this.slots.set(state.draft.player_ids.map((id) => byId.get(id) ?? null));
        this.captainId.set(state.draft.captain_id);
      }
    } catch (err) {
      this.error.set(gameErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  onSpotTap(i: number): void {
    this.message.set(null);
    const picked = this.picked();
    if (picked) {
      this.place(i, picked);
      return;
    }
    this.selected.set(this.selected() === i ? null : i);
  }

  onBenchTap(player: RosterPlayer): void {
    this.message.set(null);
    const sel = this.selected();
    if (sel !== null) {
      this.place(sel, player.player_id);
      return;
    }
    const empty = this.slots().findIndex((s) => s === null);
    if (empty >= 0 && !this.onCourt().has(player.player_id)) {
      this.place(empty, player.player_id);
      return;
    }
    // Court full (or player already on it): pick, then tap the spot to swap.
    this.picked.set(this.picked() === player.player_id ? null : player.player_id);
  }

  onDrop(event: { slot: number; playerId: string }): void {
    this.place(event.slot, event.playerId);
  }

  onDragStart(event: DragEvent, player: RosterPlayer): void {
    event.dataTransfer?.setData('text/x-player-id', player.player_id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  /** Puts a player on a spot; a player already on the court swaps places. */
  place(slot: number, playerId: string): void {
    const player = this.rosterById().get(playerId);
    if (!player) return;
    const next = [...this.slots()];
    const from = next.findIndex((s) => s?.player_id === playerId);
    if (from >= 0) next[from] = next[slot] ?? null;
    next[slot] = player;
    this.slots.set(next);
    if (!this.captainId() || !next.some((s) => s?.player_id === this.captainId())) {
      this.captainId.set(next.find((s) => s)?.player_id ?? null);
    }
    this.selected.set(null);
    this.picked.set(null);
    this.announce.set(
      `${player.name} placed at ${SPOTS[slot]!.label.toLowerCase()}.${this.captainId() === player.player_id ? ' Captain.' : ''}`,
    );
    this.seated.set(slot);
    setTimeout(() => this.seated.set(null), 300);
  }

  makeCaptain(): void {
    const p = this.selectedPlayer();
    if (p) {
      this.captainId.set(p.player_id);
      this.announce.set(`${p.name} is your captain.`);
    }
    this.selected.set(null);
  }

  removeSelected(): void {
    const i = this.selected();
    if (i === null) return;
    const next = [...this.slots()];
    const removed = next[i];
    next[i] = null;
    this.slots.set(next);
    if (removed?.player_id === this.captainId())
      this.captainId.set(next.find((s) => s)?.player_id ?? null);
    if (removed) this.announce.set(`${removed.name} back on the bench.`);
    this.selected.set(null);
  }

  async save(): Promise<void> {
    const ids = this.slots().map((s) => s?.player_id);
    const captain = this.captainId();
    if (ids.some((id) => !id) || !captain) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const result = await this.game.saveLineup(ids as string[], captain);
      const when =
        result.applies_to === this.state()?.today
          ? 'tonight'
          : 'from ' + this.dayName(result.applies_to);
      const pending = result.pending_player_ids.length;
      this.message.set(
        pending > 0
          ? `Lineup saved for ${when}. ${pending === 1 ? 'One player counts' : pending + ' players count'} the day after you added the card.`
          : `Lineup saved. It counts ${when}.`,
      );
    } catch (err) {
      const limit = parseLimitReached(err);
      if (limit) void this.paywall.open(limit.key);
      else this.error.set(gameErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  dayName(day: string): string {
    return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    });
  }

  lastName(name: string): string {
    const parts = name.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : name;
  }
}
