/** Neutral codename used everywhere in code. The public product name is TBD. */
export const APP_CODENAME = 'courtvault';

/** Shown in the website footer and the app's About screen. Required by the brief. */
export const AFFILIATION_DISCLAIMER = 'Not affiliated with the NBA, NBPA or Topps.';

/** Certified condition grades supported by the MVP. Mirrors the `grade` Postgres enum. */
export const GRADES = ['RAW', 'PSA9', 'PSA10'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABELS: Record<Grade, string> = {
  RAW: 'Raw',
  PSA9: 'PSA 9',
  PSA10: 'PSA 10',
};

/** Keys of the `plan_limits` table. Each one is enforced by a database trigger. */
export const PLAN_LIMIT_KEYS = [
  'cards',
  'followed_players',
  'price_alerts',
  'checklist_follows',
  'price_history_days',
  'photos',
] as const;
export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

/** Premium pricing, managed by RevenueCat. Displayed only; never used to grant entitlements. */
export const PREMIUM_PRICING = {
  monthlyUsd: 5.99,
  yearlyUsd: 39.99,
  trialDaysYearly: 7,
  entitlementId: 'premium',
} as const;

/** Label the brief requires everywhere a price is shown: these are eBay asking prices. */
export const PRICE_LABEL = 'Median asking price';

/** Seasons in scope for the MVP. */
export const SEASONS_IN_SCOPE = ['2025-26', '2026-27'] as const;
export type Season = (typeof SEASONS_IN_SCOPE)[number];
