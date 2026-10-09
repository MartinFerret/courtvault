'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

/**
 * PostHog, loaded once on the client. Events go through the same-origin /ingest proxy
 * (next.config.ts rewrites), so ad blockers do not drop them and robots.txt keeps the path
 * out of crawlers. No key in the environment means no analytics at all (local dev).
 */
export function Analytics() {
  useEffect(() => {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: process.env['NEXT_PUBLIC_POSTHOG_UI_HOST'] ?? 'https://eu.posthog.com',
      defaults: '2025-05-24',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      capture_dead_clicks: true,
      person_profiles: 'identified_only',
      // One visitor across hoopticker.com and app.hoopticker.com (funnel from visit to Premium).
      cross_subdomain_cookie: true,
      persistence: 'localStorage+cookie',
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
    });
  }, []);
  return null;
}

/** Custom event with the site's naming (snake_case, past tense). */
export function track(
  event: string,
  properties?: Record<string, string | number | boolean | null>,
) {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

/** Waitlist sign-up: the one identity we hold on the website. */
export function identifyWaitlist(email: string) {
  if (!posthog.__loaded) return;
  posthog.identify(email, { email, waitlist_joined_at: new Date().toISOString() });
}
