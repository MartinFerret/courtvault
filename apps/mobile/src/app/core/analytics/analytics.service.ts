import { Injectable } from '@angular/core';
import posthog from 'posthog-js';
import { environment } from '../../../environments/environment';

/**
 * PostHog in the web app, same project and same cross-subdomain cookie as the website, so a
 * visitor keeps one id from hoopticker.com to app.hoopticker.com. Funnel events:
 * signup_completed, first_card_added, first_lineup_saved (premium_started comes from the
 * payment webhooks). The user is identified by the Supabase user id, never the email.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private ready = false;

  init(): void {
    if (this.ready || !environment.posthogKey || typeof window === 'undefined') return;
    posthog.init(environment.posthogKey, {
      api_host: environment.posthogHost,
      ui_host: 'https://eu.posthog.com',
      defaults: '2025-05-24',
      person_profiles: 'identified_only',
      cross_subdomain_cookie: true,
      persistence: 'localStorage+cookie',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      session_recording: { maskAllInputs: true, maskTextSelector: '[data-ph-mask]' },
    });
    this.ready = true;
  }

  identify(userId: string, setOnce: Record<string, string> = {}): void {
    if (!this.ready) return;
    posthog.identify(userId, {}, setOnce);
  }

  capture(event: string, properties: Record<string, string | number | boolean | null> = {}): void {
    if (!this.ready) return;
    posthog.capture(event, properties);
  }

  reset(): void {
    if (this.ready) posthog.reset();
  }
}
