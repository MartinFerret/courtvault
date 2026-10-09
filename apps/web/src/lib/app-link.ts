/**
 * Links from the website to the web app (app.hoopticker.com). Every link carries UTMs so the
 * funnel knows which page sent the visitor, and an optional `action` the app runs after
 * sign-up (add a card, put a player in the lineup, follow a set).
 */
export const APP_URL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.hoopticker.com').replace(
  /\/$/,
  '',
);

export type AppAction = 'add' | 'lineup' | 'follow';

export function appLink(
  path: string,
  options: { campaign: string; action?: AppAction; content?: string },
): string {
  const url = new URL(path, `${APP_URL}/`);
  if (options.action) url.searchParams.set('action', options.action);
  url.searchParams.set('utm_source', 'hoopticker.com');
  url.searchParams.set('utm_medium', 'website');
  url.searchParams.set('utm_campaign', options.campaign);
  if (options.content) url.searchParams.set('utm_content', options.content);
  return url.toString();
}

/** Sign-up entry of the web app (onboarding keeps the UTMs and the referral code). */
export const signUpLink = (campaign: string, content?: string) =>
  appLink('/onboarding', { campaign, content });
/** For signed-in visitors. */
export const vaultLink = (campaign: string) => appLink('/tabs/vault', { campaign });
