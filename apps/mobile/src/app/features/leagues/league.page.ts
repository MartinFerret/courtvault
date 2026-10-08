import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { environment } from '../../../environments/environment';
import {
  GameService,
  gameErrorMessage,
  type LeagueMember,
  type LeaguePage as League,
  type Standings,
} from '../../core/game/game.service';

/** One private league: invite, standings by week or season, members' latest scores. */
@Component({
  selector: 'cv-league',
  imports: [
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
  ],
  templateUrl: './league.page.html',
})
export class LeaguePage {
  private readonly game = inject(GameService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly league = signal<League | null>(null);
  readonly standings = signal<Standings | null>(null);
  readonly period = signal<'week' | 'season'>('week');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly copied = signal(false);
  readonly justWon = computed(() => {
    const s = this.standings();
    return !!s && s.period === 'week' && s.me?.rank === 1 && (s.me?.points ?? 0) > 0;
  });
  readonly inviteLink = computed(() => {
    const code = this.league()?.invite_code;
    const origin =
      typeof location !== 'undefined' && location.origin.startsWith('http')
        ? location.origin
        : environment.webUrl;
    return code ? `${origin}/leagues/join/${code}` : '';
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [league, standings] = await Promise.all([
        this.game.leaguePage(this.id),
        this.game.standings('league', this.period(), this.id),
      ]);
      this.league.set(league);
      this.standings.set(standings);
    } catch (err) {
      this.error.set(gameErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async setPeriod(value: 'week' | 'season'): Promise<void> {
    this.period.set(value);
    try {
      this.standings.set(await this.game.standings('league', value, this.id));
    } catch (err) {
      this.error.set(gameErrorMessage(err));
    }
  }

  async share(): Promise<void> {
    const l = this.league();
    if (!l) return;
    const text = `Join my Vault Score league "${l.name}" with the code ${l.invite_code}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: l.name, text, url: this.inviteLink() });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${this.inviteLink()}`);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      /* the share sheet was dismissed */
    }
  }

  memberLine(m: LeagueMember): string {
    const lineup = m.last_captain ? `Captain ${m.last_captain}` : 'No lineup last night';
    return m.role === 'owner' ? `${lineup}, runs the league` : lineup;
  }

  async newCode(): Promise<void> {
    const code = await this.game.regenerateCode(this.id);
    this.league.update((l) => (l ? { ...l, invite_code: code } : l));
  }

  async leave(): Promise<void> {
    await this.game.leaveLeague(this.id);
    void this.router.navigate(['/leagues']);
  }
}
