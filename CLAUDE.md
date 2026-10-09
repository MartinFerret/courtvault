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
Domains (live): `hoopticker.com` for the website, `app.hoopticker.com` for the web app (moved
from `vault.hoopticker.com` on 2026-10-08, which now answers a 301 from the Netlify site). Never use "NBA", a team name, "Topps" or any trademark in the product name,
logo, domain or branding.

## Two surfaces, one codebase per surface (plan of 2026-10-07)

| Surface                      | Host                 | Code                                                  | Indexed                         |
| ---------------------------- | -------------------- | ----------------------------------------------------- | ------------------------------- |
| Public website (acquisition) | `hoopticker.com`     | `apps/web`, Next.js on Netlify                        | Yes                             |
| Web app (logged-in product)  | `app.hoopticker.com` | `apps/mobile` built for the browser, Cloudflare Pages | No (`noindex`, robots disallow) |

Same account, data and Premium everywhere. Never a third codebase. The SEO standard is
`docs/seo-rules.md` (rules R1 to R117, mandatory, referenced by number in commits and PRs;
copy its checklists into PRs). Keyword map: `docs/keyword-map.csv` (source) and
`docs/keyword-map.md` (generated). Architecture and slugs: `docs/site-architecture.md`.
Full plan and decisions: `docs/plan-web-seo.md`. Minimal public launch (what Martin provides,
what gets deployed, indexing policy while slugs are pending): `docs/launch-checklist.md`.
Slugs were frozen on 2026-10-07 (`public_slug` columns, `refresh_public_slugs()` after each
import, `apps/web/src/lib/paths.ts`); indexing is quality-gated by the `page_index_status`
view (sitemap index by type, robots meta). Push to GitHub at the end of every session.

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
recognition from images, PSA/CGC label scanning, user-to-user marketplace, sealed products.

In scope since 2026-10-08 (Martin's decision, plan `docs/plan-vault-score.md`): **Vault Score**
(a free daily fantasy lineup of 5 owned players plus a captain, scored from real box scores
only) and **Leagues** (global and private rankings, badges as the only reward). Legal basis
and guardrails: `docs/legal/fantasy-game.md` (no prizes, no fees, no player photos, no league
or team logos, "NBA" never in the game's name). Scoring stays behind
`app_settings.vault_score.enabled` (off in production) until Highlightly confirms derived data
is allowed (`docs/legal/highlightly-terms.md`).

## Non-negotiable constraints

### Legal

- Official imagery: no player photos, no NBA or team logos. Topps card and set images are
  allowed on the public website only, strictly within the written permission kept in
  `docs/legal/topps-permission.md` (read it before adding any image; ask Martin when the scope is
  unclear), served from our files with the credit "Card images courtesy of Topps" (pipeline:
  `apps/web/tools/images.mjs`, originals in `data/images/topps/`). User photos taken in the app
  stay private and never appear on the website.
- Set names ("Topps Chrome") are nominative use only: plain text, no logos, no Topps
  typography, nothing implying a partnership. Player names and stats are factual information.
- No scraping (eBay, Trading Card Database, Beckett...). Official APIs or files provided by
  the owner only.
- "Not affiliated with the NBA, NBPA or Topps" in the website footer and the app's About
  screen (`AFFILIATION_DISCLAIMER` in `packages/shared`).
- Never guess on legal matters, licenses or API terms: stop and ask.

### Data (100% free for the MVP)

| Data       | Source                                                                                 | Notes                                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog    | Official Topps checklists, CSV import (`scripts/src/import-checklist.ts`)              | Format in `data/checklists/README.md`. `DEMO-*.csv` are hand-written demo files                                                                                                                                         |
| Game stats | Highlightly (`https://nba.highlightly.net`, header `x-rapidapi-key`)                   | Free plan: 100 requests/day, box scores included. One night costs ~16 requests                                                                                                                                          |
| Prices     | CardSight AI (`https://api.cardsight.ai`, header `X-API-Key`), eBay sales and listings | Free tier 750 calls/month, one bulk call = 100 cards. Three labelled states (`priceKindLabel`): auction median (90 d, 3+ sales), last auction sale with date, asking median. eBay Browse stays as the disabled fallback |
| Buy links  | eBay search links (Partner Network campaign id when set)                               | Optional, plain links when no campaign id                                                                                                                                                                               |

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
pg_cron ──► job-schedule ◄── Highlightly (today's first tip-off = lineup lock)
        ──► job-stats   ◄── Highlightly (then score_game_day: Vault Score)
        ──► job-prices  ◄── CardSight AI     ──► PostgreSQL (RLS, triggers, views, RPC)
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
- Vault Score (`supabase/migrations/20261009000100_vault_score_core.sql`): `set_lineup()` saves
  the draft (5 owned players, captain, card added by the previous Eastern day, 20 saves a day),
  `lock_due_game_days()` (pg_cron every 5 minutes) freezes drafts into `lineups` at
  `game_days.first_tip_at`, `score_game_day()` (end of job-stats) writes `lineup_scores` with
  the weights of `fantasy_scoring`; only `fantasy_seasons` regular-season days count.
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
  build the ordered work list, `price_coverage` logs requested / priced / skipped per reason.
  With CardSight (`PRICE_PROVIDER=cardsight`, `supabase/functions/job-prices/cardsight-run.ts`):
  `cardsight_targets(mode)` joins the mapping tables (`cardsight_sets/cards/parallels`, filled
  by `job-catalog-map`, ids only, never their lists), the run reads the month's usage first and
  plans bulk calls (one per parallel, grade and 100 cards) under the quota: last night's players
  first, then collections and alerts, rookies, top players, the weekly full pass on Sunday;
  80% of the quota = essential cards only, 95% = last night only plus an email to `EMAIL_ADMIN`.
  Data policy until CardSight answers in writing: our own aggregates only, a 12-hour cache of
  raw responses (`cardsight_cache`), raw listings behind `price_source.store_raw_listings`.
  Details: `docs/price-source-cardsight.md`.
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
(`-- --force --day=YYYY-MM-DD`), `pnpm test:db` (pgTAP), `pnpm test:functions` (Deno), `pnpm video:duet <card-slug>` (TikTok
Duet clip from real prices, `apps/social`, renders to git-ignored `exports/social/`).

Local URLs: app http://localhost:4200, website http://localhost:3000, Studio
http://127.0.0.1:54323, Mailpit (sign-in codes) http://127.0.0.1:54324.

## Design phase rule

When the mockups arrive: use the `frontend-design` skill, then `ui-ux-pro-max`, for the app
and website screens, and the SEO skills (`seo-audit`) for the website. Change the theme tokens
and the templates only; do not touch services, RPC contracts or routing.

## Status (2026-10-07)

Done and verified locally: database with pgTAP tests, edge functions with Deno tests and mock
providers, website (SEO standard `docs/seo-rules.md`, frozen public slugs with a quality gate,
sitemap index, public Last night archive, new homepage), app in the browser (desktop layout
with sidebar and Vault table, sign-in/sign-up, CSV import, Stripe web checkout, foil frames)
and on an Android emulator (OTP sign-in, follows, scan, Vault, Card, Last night, Sets,
Profile, paywalls, exports). Nine official 2025-26 Topps checklists imported (base cards only,
numbered parallels missing for seven sets, see `data/checklists/README.md`).

Cloud: Supabase project live (migrations pushed, functions and secrets deployed in mock mode,
catalog imported), Netlify site `hoopticker` created from the CLI for the website. Not yet:
custom domains and DNS, Cloudflare Pages project for the web app, real provider keys (eBay fallback,
Highlightly, Brevo, Stripe), iOS build (needs Xcode), native deep-link files, store assets,
guides and trust pages (need the owner's bio and legal details).
