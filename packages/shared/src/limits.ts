import type { PlanLimitKey } from './constants';

/**
 * The database raises `LIMIT_REACHED:<key>` when a non-Premium user hits a plan limit.
 * Clients intercept it and open the paywall. This parser is the single source of truth
 * for that contract.
 */
export const LIMIT_REACHED_PREFIX = 'LIMIT_REACHED:';

export interface LimitReachedError {
  key: PlanLimitKey | string;
  message: string;
}

/** Returns the limit key when `err` (any Postgres/PostgREST/supabase-js error) is a plan limit error. */
export function parseLimitReached(err: unknown): LimitReachedError | null {
  const message = extractMessage(err);
  if (!message) return null;
  const index = message.indexOf(LIMIT_REACHED_PREFIX);
  if (index === -1) return null;
  const rest = message.slice(index + LIMIT_REACHED_PREFIX.length);
  const key = rest.split(/[\s"';)]/)[0] ?? '';
  if (!key) return null;
  return { key, message };
}

function extractMessage(err: unknown): string | null {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const maybe = err as { message?: unknown; details?: unknown; hint?: unknown; error?: unknown };
    for (const candidate of [maybe.message, maybe.details, maybe.hint, maybe.error]) {
      if (typeof candidate === 'string' && candidate.includes(LIMIT_REACHED_PREFIX)) return candidate;
      if (candidate && typeof candidate === 'object') {
        const nested = extractMessage(candidate);
        if (nested) return nested;
      }
    }
    if (typeof maybe.message === 'string') return maybe.message;
  }
  return null;
}
