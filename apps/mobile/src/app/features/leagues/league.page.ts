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
import {
  GameService,
  gameErrorMessage,
  type LeagueMember,
  type LeaguePage as League,
  type Standings,
} from '../../core/game/game.service';
import { ShareService, shareErrorMessage } from '../../core/share/share.service';

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
  private readonly sharing = inject(ShareService);
  readonly shareNote = signal<string | null>(null);
  /** The invite lands on hoopticker.com/join/<code>, which presents HoopTicker first. */
  readonly inviteLink = computed(() => {
    const code = this.league()?.invite_code;
    return code ? this.sharing.leagueInviteUrl(code) : '';
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
      const how = await this.sharing.send(l.name, this.inviteLink(), text);
      if (how === 'copied') {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2500);
      }
    } catch {
      /* the share sheet was dismissed */
    }
  }

  async shareRank(): Promise<void> {
    try {
      const how = await this.sharing.share(
        'league',
        `My rank in ${this.league()?.name ?? 'my league'}`,
        this.id,
      );
      this.shareNote.set(how === 'copied' ? 'Link copied.' : null);
    } catch (err) {
      this.shareNote.set(shareErrorMessage(err));
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
