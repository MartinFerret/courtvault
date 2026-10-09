import { describe, expect, it } from 'vitest';
import { appLink, signUpLink } from './app-link';

describe('app links', () => {
  it('point to the web app with the action and the UTMs', () => {
    const url = new URL(
      appLink('/cards/2025-26-topps-chrome-cooper-flagg-rookie-card-251', {
        campaign: 'card',
        action: 'add',
      }),
    );
    expect(url.origin).toBe('https://app.hoopticker.com');
    expect(url.pathname).toBe('/cards/2025-26-topps-chrome-cooper-flagg-rookie-card-251');
    expect(url.searchParams.get('action')).toBe('add');
    expect(url.searchParams.get('utm_source')).toBe('hoopticker.com');
    expect(url.searchParams.get('utm_campaign')).toBe('card');
  });

  it('sign-up goes to onboarding', () => {
    expect(new URL(signUpLink('header')).pathname).toBe('/onboarding');
  });
});
