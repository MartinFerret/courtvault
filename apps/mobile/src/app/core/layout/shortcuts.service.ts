import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { LayoutService } from './layout.service';

export interface Shortcut {
  keys: string;
  description: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: '/', description: 'Search or filter the current page' },
  { keys: 'a', description: 'Add a card' },
  { keys: 'j / k', description: 'Next / previous row' },
  { keys: 'Enter', description: 'Open the highlighted row' },
  { keys: 'g then l', description: 'Go to Last night' },
  { keys: 'g then v', description: 'Go to the Vault' },
  { keys: 'g then s', description: 'Go to Sets' },
  { keys: '?', description: 'Show this list' },
];

/**
 * Keyboard shortcuts for the web app (never on native). Rows register themselves through
 * `rowCount` and `activeRow`; pages read `activeRow` to highlight and open a row.
 */
@Injectable({ providedIn: 'root' })
export class ShortcutsService {
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly layout = inject(LayoutService);

  readonly activeRow = signal(-1);
  readonly rowCount = signal(0);
  /** Set by the page that owns a list; called on Enter. */
  openRow: ((index: number) => void) | null = null;
  private pendingPrefix: string | null = null;

  init(): void {
    if (this.layout.isNative || typeof document === 'undefined') return;
    document.addEventListener('keydown', (event) => this.handle(event));
  }

  private handle(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    const typing =
      !!target &&
      target.closest(
        'input, textarea, [contenteditable="true"], ion-input, ion-searchbar, ion-textarea',
      ) !== null;
    if (typing) {
      if (event.key === 'Escape') (target as HTMLElement).blur();
      return;
    }
    if (this.pendingPrefix === 'g') {
      this.pendingPrefix = null;
      const routes: Record<string, string> = {
        l: '/tabs/last-night',
        v: '/tabs/vault',
        s: '/tabs/sets',
        p: '/tabs/profile',
      };
      const route = routes[event.key];
      if (route) {
        event.preventDefault();
        void this.router.navigateByUrl(route);
      }
      return;
    }
    switch (event.key) {
      case 'g':
        this.pendingPrefix = 'g';
        setTimeout(() => (this.pendingPrefix = null), 1200);
        return;
      case '/': {
        event.preventDefault();
        const field = document.querySelector<HTMLElement>(
          'ion-searchbar input, [data-shortcut="search"] input, [data-shortcut="search"]',
        );
        field?.focus();
        return;
      }
      case 'a':
        event.preventDefault();
        void this.router.navigateByUrl('/tabs/scan');
        return;
      case 'j':
      case 'ArrowDown':
        if (this.rowCount() === 0) return;
        event.preventDefault();
        this.activeRow.set(Math.min(this.rowCount() - 1, this.activeRow() + 1));
        return;
      case 'k':
      case 'ArrowUp':
        if (this.rowCount() === 0) return;
        event.preventDefault();
        this.activeRow.set(Math.max(0, this.activeRow() - 1));
        return;
      case 'Enter':
        if (this.activeRow() >= 0 && this.openRow) {
          event.preventDefault();
          this.openRow(this.activeRow());
        }
        return;
      case '?':
        event.preventDefault();
        void this.showHelp();
        return;
      default:
        return;
    }
  }

  async showHelp(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Keyboard shortcuts',
      message: SHORTCUTS.map((s) => `${s.keys}: ${s.description}`).join('\n'),
      cssClass: 'cv-shortcuts',
      buttons: ['Close'],
    });
    await alert.present();
  }
}
