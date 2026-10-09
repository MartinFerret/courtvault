'use client';

import { useEffect } from 'react';

const KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ref',
] as const;

/**
 * First-touch attribution for the funnel: the UTMs (and a referral code) of the visit that
 * brought someone, kept in `ht_attr` on .hoopticker.com for 30 days so the web app can copy
 * it into the profile at sign-up. Never overwritten by later visits.
 */
export function Attribution() {
  useEffect(() => {
    if (/(?:^|;\s*)ht_attr=/.test(document.cookie)) return;
    const params = new URLSearchParams(location.search);
    const attr: Record<string, string> = {};
    for (const key of KEYS) {
      const value = params.get(key);
      if (value) attr[key] = value.slice(0, 200);
    }
    const referrer = document.referrer ? new URL(document.referrer).hostname : '';
    if (Object.keys(attr).length === 0 && (!referrer || referrer.endsWith('hoopticker.com')))
      return;
    attr['landing'] = location.pathname.slice(0, 200);
    if (referrer && !referrer.endsWith('hoopticker.com')) attr['referrer'] = referrer;
    attr['first_seen'] = new Date().toISOString();
    setAttributionCookie(attr);
  }, []);
  return null;
}

export function setAttributionCookie(attr: Record<string, string>): void {
  const domain = location.hostname.endsWith('hoopticker.com') ? '; Domain=.hoopticker.com' : '';
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `ht_attr=${encodeURIComponent(JSON.stringify(attr))}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax${domain}${secure}`;
}
