/**
 * Server-side PostHog events for the funnel steps clients cannot report reliably (a payment
 * confirmed by a webhook). Same project as the website and the web app; the distinct id is
 * the Supabase user id, which the app uses in identify(). No key = no-op.
 */
import { env } from './env.ts';

export interface ServerEvent {
  api_key: string;
  event: string;
  distinct_id: string;
  properties: Record<string, string | number | boolean | null>;
  timestamp: string;
}

export function serverEventBody(
  key: string,
  event: string,
  distinctId: string,
  properties: Record<string, string | number | boolean | null> = {},
  now = new Date(),
): ServerEvent {
  return {
    api_key: key,
    event,
    distinct_id: distinctId,
    properties: { ...properties, $lib: 'hoopticker-edge' },
    timestamp: now.toISOString(),
  };
}

/** Best effort: analytics never fails a webhook. */
export async function captureServerEvent(
  event: string,
  distinctId: string,
  properties: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  const key = env('POSTHOG_KEY');
  if (!key) return;
  const host = env('POSTHOG_HOST') ?? 'https://eu.i.posthog.com';
  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverEventBody(key, event, distinctId, properties)),
    });
  } catch (err) {
    console.log(JSON.stringify({ analytics: 'capture failed', event, err: String(err) }));
  }
}
