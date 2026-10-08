import { Routes } from '@angular/router';
import { authGuard, signedOutGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tabs/last-night' },
  {
    path: 'onboarding',
    canActivate: [signedOutGuard],
    loadComponent: () => import('./features/onboarding/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: 'onboarding/players',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/pick-players.page').then((m) => m.PickPlayersPage),
  },
  {
    path: 'onboarding/first-scan',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/first-scan.page').then((m) => m.FirstScanPage),
  },
  { path: 'auth/callback', redirectTo: 'tabs/last-night' },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'last-night' },
      {
        path: 'last-night',
        loadComponent: () =>
          import('./features/last-night/last-night.page').then((m) => m.LastNightPage),
      },
      {
        path: 'vault',
        loadComponent: () => import('./features/vault/vault.page').then((m) => m.VaultPage),
      },
      {
        path: 'scan',
        loadComponent: () => import('./features/scan/scan.page').then((m) => m.ScanPage),
      },
      {
        path: 'game',
        loadComponent: () => import('./features/game/game.page').then((m) => m.GamePage),
      },
      {
        path: 'sets',
        loadComponent: () => import('./features/sets/sets.page').then((m) => m.SetsPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },
  // Detail pages share the website's paths so deep links work unchanged.
  {
    path: 'cards/:slug',
    canActivate: [authGuard],
    loadComponent: () => import('./features/card/card.page').then((m) => m.CardPage),
  },
  {
    path: 'card/:parallelId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/card/card.page').then((m) => m.CardPage),
  },
  {
    path: 'sets/:slug',
    canActivate: [authGuard],
    loadComponent: () => import('./features/sets/set-detail.page').then((m) => m.SetDetailPage),
  },
  {
    path: 'players/:slug',
    canActivate: [authGuard],
    loadComponent: () => import('./features/players/player.page').then((m) => m.PlayerPage),
  },
  // Vault Score and Leagues (web app paths; never indexed, see public/_headers).
  {
    path: 'game/standings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/game/standings.page').then((m) => m.StandingsPage),
  },
  {
    path: 'game/rules',
    canActivate: [authGuard],
    loadComponent: () => import('./features/game/rules.page').then((m) => m.RulesPage),
  },
  {
    path: 'leagues',
    canActivate: [authGuard],
    loadComponent: () => import('./features/leagues/leagues.page').then((m) => m.LeaguesPage),
  },
  {
    path: 'leagues/join/:code',
    canActivate: [authGuard],
    loadComponent: () => import('./features/leagues/join.page').then((m) => m.LeagueJoinPage),
  },
  {
    path: 'leagues/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/leagues/league.page').then((m) => m.LeaguePage),
  },
  {
    path: 'import',
    canActivate: [authGuard],
    loadComponent: () => import('./features/import/import.page').then((m) => m.ImportPage),
  },
  {
    path: 'legal/:page',
    loadComponent: () => import('./features/profile/legal.page').then((m) => m.LegalPage),
  },
  { path: '**', redirectTo: 'tabs/last-night' },
];
