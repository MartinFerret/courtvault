'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { appLink, signUpLink } from '@/lib/app-link';
import { setAttributionCookie } from './attribution';

/** What HoopTicker is, in three lines: shared by the invite, referral and /start landings. */
export function Pitch() {
  return (
    <ul className="landing__points">
      <li>Every card&apos;s value by parallel and grade, refreshed every night.</li>
      <li>Every morning, how last night&apos;s games moved your collection.</li>
      <li>Vault Score: five of your players, real box scores, free leagues with friends.</li>
    </ul>
  );
}

/**
 * Sign-up button that carries the visit's UTMs (TikTok, Instagram bio links) into the app,
 * falling back to the campaign of the page.
 */
export function PassThroughCta({
  campaign,
  label,
  path,
}: {
  campaign: string;
  label: string;
  path?: string;
}) {
  const search = useSyncExternalStore(
    () => () => {},
    () => location.search,
    () => '',
  );
  const href = useMemo(() => {
    const url = new URL(path ? appLink(path, { campaign }) : signUpLink(campaign));
    const incoming = new URLSearchParams(search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = incoming.get(key);
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  }, [campaign, path, search]);
  return (
    <a className="button button--large" href={href} data-attr={`cta-${campaign}`}>
      {label}
    </a>
  );
}

/** Referral landing: remembers the code for sign-up (added to the first-touch attribution). */
export function RememberReferral({ code }: { code: string }) {
  useEffect(() => {
    const match = /(?:^|;\s*)ht_attr=([^;]*)/.exec(document.cookie);
    let attr: Record<string, string> = {};
    try {
      attr = match ? (JSON.parse(decodeURIComponent(match[1]!)) as Record<string, string>) : {};
    } catch {
      attr = {};
    }
    if (attr['ref']) return;
    setAttributionCookie({
      ...attr,
      ref: code.toUpperCase(),
      utm_source: attr['utm_source'] ?? 'referral',
      utm_medium: attr['utm_medium'] ?? 'invite',
      landing: attr['landing'] ?? location.pathname,
      first_seen: attr['first_seen'] ?? new Date().toISOString(),
    });
  }, [code]);
  return null;
}
