import { Injectable } from '@angular/core';

const KEY = 'ht_intent';
const TTL_MS = 60 * 60 * 1000;

/**
 * Remembers where a signed-out visitor wanted to go (a card to add, a player for the lineup,
 * a set to follow, a league invite) and sends them there right after sign-up or sign-in.
 */
@Injectable({ providedIn: 'root' })
export class IntentService {
  remember(url: string): void {
    if (!url || url.startsWith('/onboarding') || url.startsWith('/auth')) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ url, at: Date.now() }));
    } catch {
      /* private mode: the visitor lands on the default page */
    }
  }

  /** The pending URL (fresh only), removed once read. */
  consume(): string | null {
    try {
      const raw = localStorage.getItem(KEY);
      localStorage.removeItem(KEY);
      if (!raw) return null;
      const { url, at } = JSON.parse(raw) as { url: string; at: number };
      return Date.now() - at < TTL_MS && url.startsWith('/') ? url : null;
    } catch {
      return null;
    }
  }
}
