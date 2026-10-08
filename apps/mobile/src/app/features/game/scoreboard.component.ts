import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/**
 * Arena jumbotron: last night's total, a shot-clock style countdown to the lineup lock, and
 * the weekly rank with its movement. Pure display: inputs come from GameService.
 */
@Component({
  selector: 'cv-scoreboard',
  imports: [IonIcon],
  templateUrl: './scoreboard.component.html',
})
export class ScoreboardComponent {
  readonly lastTotal = input<number | null>(null);
  readonly lastLabel = input('Last night');
  readonly lastNote = input<string | null>(null);
  readonly lockAt = input<string | null>(null);
  readonly locked = input(false);
  readonly games = input(0);
  readonly rank = input<number | null>(null);
  readonly movement = input<number | null>(null);
  readonly rankNote = input<string | null>(null);

  private readonly now = signal(Date.now());

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /** "04:32" (hours:minutes) above an hour, "12:09" (minutes:seconds) in the last hour. */
  readonly countdown = computed(() => {
    const at = this.lockAt();
    if (!at || this.locked()) return null;
    const ms = Date.parse(at) - this.now();
    if (Number.isNaN(ms) || ms <= 0) return null;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0
      ? { value: `${pad(h)}:${pad(m)}`, unit: 'hours : minutes' }
      : { value: `${pad(m)}:${pad(s)}`, unit: 'minutes : seconds' };
  });

  readonly lockTime = computed(() => {
    const at = this.lockAt();
    if (!at) return null;
    return (
      new Date(at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
      }) + ' ET'
    );
  });
}
