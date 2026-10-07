# CLAUDE.md

Guidance for any session working on this repository. Everything here is in English: UI copy,
code, comments, commit messages, docs. Setup and commands are in `README.md`.

## Product

A catalog website + mobile app for basketball trading card collectors in the United States.

- **Website** (`apps/web`): captures Google traffic with one page per card, player and set,
  then sends visitors to the app (waitlist until the app is published).
- **App** (`apps/mobile`): scan a card, see its value by parallel and grade, track a collection.
- **Differentiator**: every morning the "Last night" screen shows the stats of each player
  the user owns or follows and how those games moved the value of their cards. This is the
  daily reason to open the app.
- **Business model**: freemium, MRR-driven, App Store and Google Play.
- **Target**: US collectors, American English, prices in US dollars.
- **Visual direction**: the art direction in `docs/img.png` (applied 2026-10-06). Light cool
  off-white canvas, tonal surfaces without borders or shadows, one lime accent for the primary
  action and selected states, geometric sans (Outfit, self-hosted), 28px card radius, pill
  buttons and chips, big stat tiles, a faded lime watermark word behind hero areas. Onboarding
  hero: a full-bleed photograph in the hero panel, shown in grayscale with a lime tint and the
  brand word HOOP / FOLIO on top (`apps/mobile/public/art-hero.webp`). The photo is a
  royalty-free image supplied by Martin on 2026-10-07 (original kept in `docs/img_3.png`,
  cropped to remove the source mark); Martin confirmed the license. `public/art-dunk.svg` (public domain silhouette) is used on the first-scan
  screen. Never a photo or likeness of a real NBA player (legal). Theming goes through tokens only (`apps/mobile/src/theme/tokens.scss`,
  `apps/web/src/app/globals.css`); templates carry the layout, services never change for design.

Product name: **HoopTicker** (`BRAND_NAME` in `packages/shared`, the only place it is spelled;
tagline `BRAND_TAGLINE`). Codename `courtvault` stays in package names, database objects,
env variable names and the GitHub repo. Bundle id `app.hoopticker.mobile`, scheme `hoopticker://`.
Domains (to be confirmed by Martin): `hoopticker.com` for the website, `vault.hoopticker.com`
for the web app. Never use "NBA", a team name, "Topps" or any trademark in the product name,
logo, domain or branding.

## Two surfaces, one codebase per surface (plan of 2026-10-07)

| Surface                      | Host                  | Code                                                  | Indexed                         |
| ---------------------------- | --------------------- | ----------------------------------------------------- | ------------------------------- |
| Public website (acquisition) | `hoopticker.com`       | `apps/web`, Next.js on Netlify                        | Yes                             |
| Web app (logged-in product)  | `vault.hoopticker.com` | `apps/mobile` built for the browser, Cloudflare Pages | No (`noindex`, robots disallow) |

Same account, data and Premium everywhere. Never a third codebase. The SEO standard is
`docs/seo-rules.md` (rules R1 to R117, mandatory, referenced by number in commits and PRs;
copy its checklists into PRs). Keyword map: `docs/keyword-map.csv` (source) and
`docs/keyword-map.md` (generated). Architecture and slugs: `docs/site-architecture.md`.
Full plan and decisions: `docs/plan-web-seo.md`. Minimal public launch (what Martin provides,
what gets deployed, indexing policy while slugs are pending): `docs/launch-checklist.md`.
Slugs are frozen with `NEXT_PUBLIC_SLUGS_FROZEN=true` on Netlify; before that only the homepage
is indexable and in the sitemap. Push to GitHub at the end of every session.

## Vocabulary

- **Set**: a Topps product for a season (e.g. "2025-26 Topps Chrome").
- **Card**: a card in a set, identified by its number (#3 Cooper Flagg). Unique (set, number).
- **Parallel**: a variant of the same card (Base, Refractor, Gold /50, Red /5, Superfractor 1/1).
  "Base" is a parallel too. Unique (card, name).
- **Serial run / serial number**: limited print run. "12/50" = copy 12 of 50.
- **Grade**: certified condition. MVP enum: `RAW`, `PSA9`, `PSA10`.
- **Rookie**: a player's first-year card (`cards.is_rookie`).

## Scope

In scope: NBA basketball only, Topps 2025-26 sets and Topps 2026-27 sets as they release
(2026-27 Flagship first).

Out of scope, do not build: other sports, sets older than 2025-26, automatic parallel
recognition from images, PSA/CGC label scanning, leaderboards and badges, user-to-user
marketplace, sealed products.

## Non-negotiable constraints

### Legal

- No official imagery: no player photos, no Topps artwork, no NBA or team logos. The only card
  images are photos taken by the user, private by default, never shown on the public website.
- Set names ("Topps Chrome") are nominative use only: plain text, no logos, no Topps
  typography, nothing implying a partnership. Player names and stats are factual information.
- No scraping (eBay, Trading Card Database, Beckett...). Official APIs or files provided by
  the owner only.
- "Not affiliated with the NBA, NBPA or Topps" in the website footer and the app's About
  screen (`AFFILIATION_DISCLAIMER` in `packages/shared`).
- Never guess on legal matters, licenses or API terms: stop and ask.

### Data (100% free for the MVP)

| Data       | Source                                                                    | Notes                                                                                       |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Catalog    | Official Topps checklists, CSV import (`scripts/src/import-checklist.ts`) | Format in `data/checklists/README.md`. `DEMO-*.csv` are hand-written demo files             |
| Game stats | Highlightly (`https://nba.highlightly.net`, header `x-rapidapi-key`)      | Free plan: 100 requests/day, box scores included. One night costs ~16 requests              |
| Prices     | eBay Browse API, active listings (OAuth client credentials, `EBAY_US`)    | Asking prices, not sold prices. Label them "Median asking price" everywhere (`PRICE_LABEL`) |
| Buy links  | eBay Partner Network via `X-EBAY-C-ENDUSERCTX`                            | Optional, plain links when no campaign id                                                   |

Every external source goes through an interface in `supabase/functions/_shared/providers/`
with a real and a deterministic mock implementation, selected by `STATS_PROVIDER`,
`PRICE_PROVIDER`, `PUSH_PROVIDER`. Without keys, everything runs in mock mode. Swapping the
price source for a paid sold-price provider touches only `providers/prices.ts`.

### Monetization

|                                  | Free               | Premium                                          |
| -------------------------------- | ------------------ | ------------------------------------------------ |
| Cards in collection              | 300                | Unlimited                                        |
| Scans                            | Unlimited          | Unlimited                                        |
| Players followed in "Last night" | 3                  | Unlimited                                        |
| Price alerts                     | 2                  | Unlimited                                        |
| Followed checklists              | 1                  | Unlimited                                        |
| Price history                    | 30 days            | Full                                             |
| Gains/losses                     | No                 | Yes                                              |
| Collection export                | Basic (cards only) | Full with values, 24h/30d change, gains, summary |
| Card photos (storage budget)     | 300                | 1,000                                            |

- Premium: $5.99/month or $49.99/year with a 7-day trial on the annual plan ("save 30%" is
  computed, never typed), plus the Founder's Lifetime at $149 one-time during the launch period
  (feature flag with end date and buyer cap, honest remaining count). All amounts live in
  `PRICING` (`packages/shared`), pinned by a test, and must match the RevenueCat products
  `premium_monthly`, `premium_yearly`, `founders_lifetime`. Sold on web (RevenueCat Web
  Billing), iOS and Android. App user id = Supabase user id. No weekly plan.
- Limits live in `plan_limits` and are enforced by the database (triggers, storage policy,
  RLS on `price_points`). Clients read them for display only.
- On violation the database raises `LIMIT_REACHED:<key>`. `parseLimitReached()` in
  `packages/shared` parses it; the app's `GlobalErrorHandler` and services open the paywall.
  Edge functions use the same contract for server-enforced features (`LIMIT_REACHED:full_export`).
- Users can never write their own Premium status: only `revenuecat-webhook` (service role)
  updates `profiles.is_premium` / `premium_until`. `public.is_premium()` is the single check.

### App stores

- Sign in with Apple must be enabled before App Store submission (Google sign-in is offered).
- Digital purchases only through in-app purchases (RevenueCat).
- Legal screens: terms, privacy, account deletion (`delete-account` function).
- Ask for notification permission after the first scan, never at launch.

## Architecture

**No custom backend server.** Supabase is the backend. Free tiers only: Supabase Free and
Netlify Free (Vercel excluded: its free plan forbids commercial use).

```
Topps CSV ──► import script (service role) ──┐
                                             ▼
pg_cron ──► job-stats   ◄── Highlightly
        ──► job-prices  ◄── eBay Browse      ──► PostgreSQL (RLS, triggers, views, RPC)
        ──► job-alerts  ──► FCM                     ▲            ▲
        ──► job-morning ──► FCM                     │            │
RevenueCat ──► revenuecat-webhook ──────────────────┘            │
apps/web (anon key, server-side, public data) ───────────────────┤
apps/mobile (user session) ──► tables, RPC, storage, ────────────┘
                               scan-match, export-csv, delete-account
```

- `packages/shared`: generated `database.types.ts` (`pnpm db:types`), money (cents), Eastern
  dates, slugs, constants, `LIMIT_REACHED` parser. Used by web, app and scripts. Edge
  functions duplicate the few helpers they need (`_shared/dates.ts`) because they bundle
  separately.
- All business logic (collection value, 24h change split into market/added, limits, morning
  report, search, rankings) lives in SQL functions/views or edge functions. Never duplicate it
  in clients.
- Database: see `supabase/migrations/` (numbered by concern: schema, profiles/premium, plan
  limits, RLS, prices, RPC, storage, jobs/cron, usage). `price_points` has no surrogate key and
  stores one row per actual price change (`record_price()`); `current_prices` holds the last
  price (`latest_prices` view). Compaction: daily for 90 days, weekly to 1 year, monthly after.
- Scheduled jobs run in UTC at both Eastern offsets; functions gate on the local hour and are
  idempotent per Eastern day via `job_runs` (`_shared/jobs.ts`).
- Website: ISR (1h) + on-demand revalidation (`/api/revalidate`, tags `prices`, `catalog`,
  `last-night`, pinged by job-prices), never a redeploy for data. Deploy previews disabled.
  Only stable Next.js features.
- Public "Last night" page (`/last-night`, `/last-night/[date]`): `public_last_night(day,
min_sample, min_price_cents)` builds the whole page as JSON from games, stat lines and
  price history (no user data). Movers = cards of players who played, price before tip-off
  (6 PM Eastern) vs after the next morning's update; thresholds default to 5 listings and $5
  (`LAST_NIGHT_MIN_SAMPLE`, `LAST_NIGHT_MIN_PRICE_CENTS`). Off day: latest night with a note.
  Wording reports what moved, never why. Generic foil frames instead of imagery. One Open Graph
  image per night, generated with the page by ISR and cached. Archive days in the sitemap.
- Collection export: `export-csv` with `mode=basic|full`; `collection_export()` computes the
  figures for the signed-in user. The basic export is also offered in the account deletion flow.
- Showcase price coverage (`app_settings` keys `showcase` and `showcase_parallels`): every night
  job-prices prices, in this order, collections and alerts, then cards of players who played
  last night, then every rookie, then the top 60 players by recent game score (14-day window,
  +2 per follower). Per card: Base + 2 preferred parallels per set (listing counts re-rank them
  once known); Raw, plus PSA 10 for rookie Base cards. `showcase_pairs()` / `parallels_to_price()`
  build the ordered work list, `price_call_budget()` caps calls per night (3,500 by default,
  eBay Browse quota 5,000), `price_coverage` logs requested / priced / skipped per reason.
- App: standalone components + signals, lazy routes, one Angular service per domain in
  `src/app/core/` (supabase, auth, plan, catalog, collection, scan, morning, follows, alerts,
  billing, push, deeplinks). Components never call Supabase directly. Routes mirror the
  website paths (`/cards/:slug`, `/players/:slug`, `/sets/:slug`) for deep links.
- Escape hatch: if business logic outgrows SQL and edge functions, a dedicated backend can be
  added later on top of the same database without changing the clients' contracts.

## Conventions

- TypeScript strict everywhere, Deno for edge functions, pnpm workspaces, Prettier.
- snake_case in SQL, camelCase in TypeScript. Money always integer cents. Game days are
  US Eastern dates (`toEasternDay`). Timestamps are `timestamptz`.
- Angular selectors use the `cv` prefix. Templates live in `.html` files next to components
  so the design phase can restyle without touching wiring.
- Service-role-only SQL functions revoke execute from `anon` and `authenticated`.
- Edge functions verify callers themselves (`verify_jwt = false` in `config.toml`): user
  functions check the session JWT, jobs check `x-job-secret`, the webhook checks its secret.
- Secrets never in code. `.env.example` files document every variable; `.env` files are
  gitignored. The service role key is never shipped to a client.
- Small commits, one feature at a time. Typecheck and tests green before committing.
- Check Supabase Free and Netlify Free limits whenever adding storage, jobs or traffic
  (numbers in `README.md`).

## Commands

Root: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm db:start`,
`pnpm db:reset` (migrations + seed + `FREE_CARD_LIMIT_OVERRIDE`), `pnpm db:types`,
`pnpm db:usage`, `pnpm import:checklist <file>`, `pnpm job:<stats|prices|alerts|morning|compact>`
(`-- --force --day=YYYY-MM-DD`), `pnpm test:db` (pgTAP), `pnpm test:functions` (Deno).

Local URLs: app http://localhost:4200, website http://localhost:3000, Studio
http://127.0.0.1:54323, Mailpit (sign-in codes) http://127.0.0.1:54324.

## Design phase rule

When the mockups arrive: use the `frontend-design` skill, then `ui-ux-pro-max`, for the app
and website screens, and the SEO skills (`seo-audit`) for the website. Change the theme tokens
and the templates only; do not touch services, RPC contracts or routing.

## Status (2026-10-06)

Done and verified locally: database with pgTAP tests, edge functions with Deno tests and mock
providers, website (built, SEO tags, sitemap, waitlist, public Last night page with archive),
app walked through in the browser and on an Android emulator (OTP sign-in, follows, simulated
and native scan, Vault, Card, Last night, Sets, Profile, paywall on card and follow limits,
basic/full export). Official 2025-26 Topps checklists converted and imported
(`pnpm convert:checklist`, anomalies reports in `data/checklists/`). Not yet: iOS (needs Xcode), real
provider keys, cloud deployment, native deep-link files, store assets.
