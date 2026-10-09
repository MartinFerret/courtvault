import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { GameService, type PlayerScore, type Standings } from '../../core/game/game.service';
import { ShareService, shareErrorMessage } from '../../core/share/share.service';

/**
 * Post-game recap for the Last night screen: the lineup's final score (rolls up once),
 * the player of the game under a spotlight, a box score with fantasy points, rank change.
 */
@Component({
  selector: 'cv-recap',
  imports: [RouterLink, IonIcon],
  templateUrl: './recap.component.html',
})
export class RecapComponent {
  private readonly game = inject(GameService);
  readonly standings = signal<Standings | null>(null);
  readonly shown = signal(0);
  readonly loaded = signal(false);
  private readonly sharing = inject(ShareService);
  readonly shareNote = signal<string | null>(null);
  private rolled = false;

  readonly day = computed(() => this.game.scores()?.days[0] ?? null);
  readonly rows = computed<PlayerScore[]>(() => this.day()?.per_player ?? []);
  readonly potg = computed(() => {
    const played = this.rows().filter((r) => r.played);
    if (played.length === 0) return null;
    return played.reduce((best, r) =>
      r.fpts / (r.captain ? 2 : 1) > best.fpts / (best.captain ? 2 : 1) ? r : best,
    );
  });
  readonly me = computed(() => this.standings()?.me ?? null);
  readonly dayLabel = computed(() => {
    const d = this.day()?.game_day;
    return d
      ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : '';
  });

  constructor() {
    void this.game
      .loadScores(7)
      .catch(() => null)
      .finally(() => this.loaded.set(true));
    void this.game
      .standings('global', 'week')
      .then((s) => this.standings.set(s))
      .catch(() => null);
    effect(() => {
      const total = this.day()?.total;
      if (total === undefined || total === null) return;
      untracked(() => this.rollUp(Number(total)));
    });
  }

  /** Counts the total up once, like a scoreboard after the buzzer. Instant with reduced motion. */
  private rollUp(target: number): void {
    const reduce =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.rolled || reduce) {
      this.shown.set(target);
      return;
    }
    this.rolled = true;
    const start = performance.now();
    const duration = 900;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.shown.set(Math.round(target * eased * 10) / 10);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  initials(name: string | null): string {
    return (name ?? '?')
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase())
      .slice(0, 2)
      .join('');
  }

  async shareScore(): Promise<void> {
    try {
      const how = await this.sharing.share('lineup', 'My Vault Score');
      this.shareNote.set(how === 'copied' ? 'Link copied.' : null);
    } catch (err) {
      this.shareNote.set(shareErrorMessage(err));
    }
  }

  statLine(r: PlayerScore): string {
    if (!r.played) return 'Did not play';
    const parts = [`${r.points ?? 0} pts`, `${r.rebounds ?? 0} reb`, `${r.assists ?? 0} ast`];
    if (r.steals) parts.push(`${r.steals} stl`);
    if (r.blocks) parts.push(`${r.blocks} blk`);
    return parts.join(', ');
  }
}
