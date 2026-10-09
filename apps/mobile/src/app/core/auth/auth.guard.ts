import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { IntentService } from '../analytics/intent.service';

/**
 * Waits for the stored session to load, then redirects to onboarding when signed out. The
 * requested URL (a card to add, a league to join...) is kept and opened after sign-in.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const intents = inject(IntentService);
  await firstValueFrom(toObservable(auth.ready).pipe(filter(Boolean)));
  if (auth.isSignedIn()) return true;
  intents.remember(state.url);
  return router.createUrlTree(['/onboarding']);
};

/** OAuth return (/auth/callback): the pending intent first, else Last night. */
export const authCallbackGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const intents = inject(IntentService);
  await firstValueFrom(toObservable(auth.ready).pipe(filter(Boolean)));
  return router.parseUrl(intents.consume() ?? '/tabs/last-night');
};

export const signedOutGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await firstValueFrom(toObservable(auth.ready).pipe(filter(Boolean)));
  return auth.isSignedIn() ? router.createUrlTree(['/tabs/last-night']) : true;
};
