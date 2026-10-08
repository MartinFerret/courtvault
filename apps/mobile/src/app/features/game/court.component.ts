import { Component, computed, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { FoilClassPipe, FoilHuePipe, FoilSatPipe } from '../../shared/pipes';
import type { RosterPlayer } from '../../core/game/game.service';

/** Where the five spots sit on the half-court (percent of width / height, basket at the top). */
export const SPOTS: { x: number; y: number; label: string }[] = [
  { x: 50, y: 80, label: 'Top of the key' },
  { x: 17, y: 52, label: 'Left wing' },
  { x: 83, y: 52, label: 'Right wing' },
  { x: 31, y: 20, label: 'Left block' },
  { x: 69, y: 20, label: 'Right block' },
];

/**
 * The half-court seen from above: hardwood (CSS), court lines (inline SVG), five spots.
 * Desktop: drop a bench player on a spot. Everywhere: tap a spot, then a bench player.
 */
@Component({
  selector: 'cv-court',
  imports: [IonIcon, FoilClassPipe, FoilHuePipe, FoilSatPipe],
  templateUrl: './court.component.html',
})
export class CourtComponent {
  readonly slots = input<(RosterPlayer | null)[]>([null, null, null, null, null]);
  readonly captainId = input<string | null>(null);
  readonly locked = input(false);
  readonly lockLabel = input('Locked at tip-off');
  readonly selected = input<number | null>(null);
  readonly seated = input<number | null>(null);
  readonly spotTap = output<number>();
  readonly playerDrop = output<{ slot: number; playerId: string }>();

  readonly spots = SPOTS;
  readonly dropTarget = signal<number | null>(null);
  readonly filled = computed(() => this.slots().filter((s) => s !== null).length);

  initials(name: string): string {
    return name
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((p) => p[0]!.toUpperCase())
      .slice(0, 2)
      .join('');
  }

  /** "Topps Chrome Sapphire" -> "Chrome Sapphire", "Topps Basketball" -> "Topps". */
  shortSet(set: string): string {
    if (set === 'Topps Basketball') return 'Topps';
    return set.replace(/^Topps /, '');
  }

  lastName(name: string): string {
    const parts = name.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : name;
  }

  spotLabel(i: number): string {
    const p = this.slots()[i];
    const where = this.spots[i]!.label;
    if (!p) return `${where}: empty spot. Choose a player.`;
    const captain = p.player_id === this.captainId() ? ', captain' : '';
    return `${where}: ${p.name}${captain}`;
  }

  onDragOver(event: DragEvent, i: number): void {
    if (this.locked()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTarget.set(i);
  }

  onDrop(event: DragEvent, i: number): void {
    event.preventDefault();
    this.dropTarget.set(null);
    const playerId = event.dataTransfer?.getData('text/x-player-id');
    if (playerId && !this.locked()) this.playerDrop.emit({ slot: i, playerId });
  }
}
