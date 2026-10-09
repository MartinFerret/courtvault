'use client';

import { useSyncExternalStore } from 'react';
import { signUpLink, vaultLink } from '@/lib/app-link';

/**
 * The web app sets `ht_session=1` on .hoopticker.com while someone is signed in (a flag only,
 * never a token). Read in the browser after the first paint so ISR pages stay identical for
 * everyone: signed-out HTML first, then the signed-in label.
 */
const noSubscribe = () => () => {};

export function useSignedIn(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => /(?:^|;\s*)ht_session=1(?:;|$)/.test(document.cookie),
    () => false,
  );
}

/** Header action: "Sign up free" or "Open my Vault". */
export function HeaderCta() {
  const signedIn = useSignedIn();
  return (
    <a
      href={signedIn ? vaultLink('header') : signUpLink('header')}
      className="button button--small site-header__cta"
      data-attr={signedIn ? 'cta-navbar-vault' : 'cta-navbar-signup'}
    >
      {signedIn ? 'Open my Vault' : 'Sign up free'}
    </a>
  );
}

/** A contextual action button (the app runs the action after sign-up when needed). */
export function ActionCta({
  href,
  label,
  attr,
  className = 'button',
}: {
  href: string;
  label: string;
  attr: string;
  className?: string;
}) {
  return (
    <a href={href} className={className} data-attr={attr}>
      {label}
    </a>
  );
}

/** Block CTA: sign up, or open the Vault when already signed in. */
export function SignUpOrVault({
  campaign,
  signUpLabel = 'Start free',
}: {
  campaign: string;
  signUpLabel?: string;
}) {
  const signedIn = useSignedIn();
  return (
    <a
      href={signedIn ? vaultLink(campaign) : signUpLink(campaign)}
      className="button"
      data-attr={signedIn ? 'cta-block-vault' : 'cta-block-signup'}
    >
      {signedIn ? 'Open my Vault' : signUpLabel}
    </a>
  );
}
