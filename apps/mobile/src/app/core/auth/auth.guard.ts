import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

/** Waits for the stored session to load, then redirects to onboarding when signed out. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await firstValueFrom(toObservable(auth.ready).pipe(filter(Boolean)));
  return auth.isSignedIn() ? true : router.createUrlTree(['/onboarding']);
};

export const signedOutGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await firstValueFrom(toObservable(auth.ready).pipe(filter(Boolean)));
  return auth.isSignedIn() ? router.createUrlTree(['/tabs/last-night']) : true;
};
