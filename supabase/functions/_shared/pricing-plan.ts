/**
 * Planning of a CardSight pricing run: which cards, in which order, within how many calls.
 * Pure functions, so the budget guard is unit-tested without a database or an API key.
 *
 * Priority (the user's rule of 2026-10-08): last night's players first, always; then owned
 * and followed cards and alerts; then the showcase (rookies, top players); then the weekly
 * full pass.
 */
import { BULK_MAX_CARDS, bulkGroupKey } from './providers/cardsight.ts';

export type RunMode = 'normal' | 'essential' | 'critical';

export interface GuardSettings {
  monthlyQuota: number;
  /** Fraction of the quota above which only essential cards are priced (0.8). */
  guardSoft: number;
  /** Fraction above which only last night's players are priced and the admin is emailed (0.95). */
  guardHard: number;
  /** Calls kept untouched at the end of the month, for the app's own needs. */
  reserveCalls: number;
}

/** The mode for this run, from the calls already counted this month. */
export function decideMode(callsUsed: number, s: GuardSettings): RunMode {
  const ratio = s.monthlyQuota > 0 ? callsUsed / s.monthlyQuota : 1;
  if (ratio >= s.guardHard) return 'critical';
  if (ratio >= s.guardSoft) return 'essential';
  return 'normal';
}

/** Calls this run may make: what is left under the quota, minus the reserve. */
export function callsAllowed(callsUsed: number, s: GuardSettings): number {
  return Math.max(0, s.monthlyQuota - s.reserveCalls - callsUsed);
}

const RANK: Record<string, number> = {
  played_last_night: 0,
  collection: 1,
  alert: 2,
  rookie: 3,
  top_player: 4,
  full_pass: 5,
};

export function reasonRank(reason: string): number {
  return RANK[reason] ?? 6;
}

/** Reasons priced in each mode. */
export function reasonAllowed(reason: string, mode: RunMode): boolean {
  if (mode === 'normal') return true;
  if (mode === 'essential') return reasonRank(reason) <= 2;
  return reason === 'played_last_night';
}

export interface PlanTarget {
  key: string;
  cardId: string;
  reason: string;
  cardsightParallelId: string | null;
  cardsightGradeId: string | null;
}

export interface Plan<T extends PlanTarget> {
  /** Targets kept, in priority order. */
  targets: T[];
  /** Bulk calls those targets need. */
  calls: number;
  /** Targets dropped for the card cap or the call budget. */
  dropped: number;
}

/** Bulk calls a set of targets needs: one per parallel, grade and 100 cards. */
export function callsFor(targets: PlanTarget[]): number {
  const sizes = new Map<string, number>();
  for (const t of targets) {
    const k = bulkGroupKey(t);
    sizes.set(k, (sizes.get(k) ?? 0) + 1);
  }
  let calls = 0;
  for (const n of sizes.values()) calls += Math.ceil(n / BULK_MAX_CARDS);
  return calls;
}

/**
 * Keeps the highest-priority targets that fit: first the distinct-card cap (daily passes),
 * then the call budget. Targets of a card that passed the cap all stay together; the budget
 * drops whole targets from the lowest priority up until the calls fit.
 */
export function planRun<T extends PlanTarget>(
  targets: T[],
  options: { maxCalls: number; maxCards?: number },
): Plan<T> {
  const ordered = [...targets].sort((a, b) => reasonRank(a.reason) - reasonRank(b.reason));
  let kept: T[] = ordered;
  let dropped = 0;

  if (options.maxCards !== undefined) {
    const cards = new Set<string>();
    kept = [];
    for (const t of ordered) {
      if (!cards.has(t.cardId) && cards.size >= options.maxCards) {
        dropped++;
        continue;
      }
      cards.add(t.cardId);
      kept.push(t);
    }
  }

  let calls = callsFor(kept);
  while (calls > options.maxCalls && kept.length > 0) {
    kept.pop();
    dropped++;
    calls = callsFor(kept);
  }
  return { targets: kept, calls, dropped };
}

/** The weekly full pass runs on its weekday, once per calendar week. */
export function isFullPassDue(
  day: string,
  weekday: number,
  lastFullPassDay: string | null,
): boolean {
  const date = new Date(`${day}T12:00:00Z`);
  if (date.getUTCDay() !== weekday) return false;
  if (!lastFullPassDay) return true;
  const last = new Date(`${lastFullPassDay}T12:00:00Z`);
  return date.getTime() - last.getTime() >= 6 * 86_400_000;
}
