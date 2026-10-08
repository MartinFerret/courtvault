/** Neutral codename kept in package names, database objects and technical identifiers. */
export const APP_CODENAME = 'courtvault';

/** Public product name: the only place it is spelled. Every user-facing text imports it (R69, R76). */
export const BRAND_NAME = 'HoopTicker';
/** Positioning line, used on the website, the app stores and the onboarding hero. */
export const BRAND_TAGLINE = 'Turn your basketball card collection into a portfolio.';
/** The daily reason to open the app, appended to the tagline where there is room. */
export const BRAND_DIFFERENTIATOR = "See what last night's games did to it.";
/** Deep link scheme of the mobile app (Universal Links / App Links use the website paths). */
export const APP_SCHEME = 'hoopticker://';
/** Bundle id (iOS) and application id (Android), pinned in apps/mobile/capacitor.config.ts. */
export const APP_BUNDLE_ID = 'app.hoopticker.mobile';
/**
 * Website paths the installed app opens (Universal Links, App Links). They mirror the routes
 * DeepLinkService maps; patterns use the apple-app-site-association syntax.
 */
export const APP_LINK_PATHS = [
  '/cards/*',
  '/players/*',
  '/checklists/*',
  '/trending-basketball-cards',
  '/trending-basketball-cards/*',
  '/most-valuable-basketball-rookie-cards',
] as const;

/** Shown in the website footer and the app's About screen. Required by the brief. */
export const AFFILIATION_DISCLAIMER = 'Not affiliated with the NBA, NBPA or Topps.';

/**
 * Legal operator of the service (French sole trader), given by Martin on 2026-10-08. The only
 * place these details are spelled: legal pages, About screen, email footers and store listings
 * import them. The contact mailbox is Martin's own address (given 2026-10-08); the digest sender stays hello@hoopticker.com.
 */
export const LEGAL_ENTITY = {
  name: 'Martin Ferret',
  addressLines: ['9 rue des Érables', '45250 Briare', 'France'],
  siren: '999 111 438',
  contactEmail: 'mferret.pro@gmail.com',
} as const;
/** One-line postal address for email footers (CAN-SPAM) and short legal notices. */
export const LEGAL_POSTAL_ADDRESS = `${BRAND_NAME} (${LEGAL_ENTITY.name}), ${LEGAL_ENTITY.addressLines.join(', ')}`;

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

/**
 * Pricing: the single source of truth (R69). Displayed by the paywall, the web checkout, the
 * website, structured data and the store listing drafts. Never used to grant entitlements:
 * only the RevenueCat webhook writes Premium status. The same amounts must be configured in
 * RevenueCat (App Store, Google Play, Web Billing) under the product ids below.
 */
export const PRICING = {
  currency: 'USD',
  monthlyUsd: 5.99,
  yearlyUsd: 49.99,
  trialDaysYearly: 7,
  /** Founder's Lifetime: one-time payment, available during the launch period only (feature flag). */
  lifetimeUsd: 149,
  entitlementId: 'premium',
  products: {
    monthly: 'premium_monthly',
    yearly: 'premium_yearly',
    lifetime: 'founders_lifetime',
  },
} as const;

/** Rounded saving of the yearly plan versus twelve monthly payments, e.g. 30 for "save 30%". */
export function yearlySavingsPercent(
  pricing: { monthlyUsd: number; yearlyUsd: number } = PRICING,
): number {
  return Math.round((1 - pricing.yearlyUsd / (pricing.monthlyUsd * 12)) * 100);
}

/** Formats a USD amount for display: $5.99, $149. */
export function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/**
 * Prices come from CardSight AI (eBay sales and listings) since 2026-10-08, in three states.
 * Every figure says which one it is; the generic label covers sums and mixed tables.
 */
export type PriceKind = 'auction_median' | 'last_auction' | 'ask_median';
export const PRICE_KIND_LABELS: Record<PriceKind, string> = {
  auction_median: 'Recent auction sales',
  last_auction: 'Last auction sale',
  ask_median: 'Current asking price',
};
/** The label of one figure, with the sale date for a last auction sale ("Last auction sale, Oct 2"). */
export function priceKindLabel(kind: string | null | undefined, saleAt?: string | null): string {
  const label =
    PRICE_KIND_LABELS[(kind ?? 'ask_median') as PriceKind] ?? PRICE_KIND_LABELS.ask_median;
  if (kind === 'last_auction' && saleAt) {
    const d = new Date(saleAt);
    if (!Number.isNaN(d.getTime())) {
      return `${label}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}`;
    }
  }
  return label;
}
/** Generic label for a total or a column that mixes the three states. */
export const PRICE_LABEL = 'Market value';
/** One sentence that explains the three states, shown next to tables and totals. */
export const PRICE_LABEL_NOTE =
  'The median of recent eBay auction sales when there are at least 3, the last auction sale with its date when there are 1 or 2, otherwise the median of current asking prices. Each value says which.';
export const PRICE_SOURCE_NAME = 'CardSight AI';
/** Credit line for the data source. CardSight requires none; we say where the numbers come from. */
export const PRICE_SOURCE_CREDIT = 'Market data by CardSight AI, from eBay sales and listings.';

/** Seasons in scope for the MVP. */
export const SEASONS_IN_SCOPE = ['2025-26', '2026-27'] as const;
export type Season = (typeof SEASONS_IN_SCOPE)[number];
