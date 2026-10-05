# Mission: set up the full project architecture

You are the lead developer on this project. Your goal in this session: **understand the product, then set up the entire architecture, wired end to end**, so a user can walk through the complete flow locally (with mock data when API keys are missing).

You are **not** doing the final design: mockups will come later. Build clean, functional screens, structured so the mockups can be dropped in without rewiring anything.

Read this entire brief before writing any code. Then propose a short plan (steps, order, open questions), wait for my approval, and execute.

Everything in this project is in **English**: UI copy, code, comments, commit messages, README, CLAUDE.md.

**Architecture principle: no custom backend server.** Supabase is the backend (database, auth, storage, access rules, edge functions, scheduled jobs). Keep server-side code to the minimum the product needs. Everything must run on free tiers: **Supabase Free** (backend) and **Netlify Free** (website hosting; Vercel's free plan forbids commercial use, so Vercel is excluded).

---

## 1. The product

A **catalog website + mobile app** for NBA trading card collectors in the United States.

- **The website** captures Google traffic with one page per card, per player and per set, then sends visitors to the app.
- **The app** lets users scan a card, see its value by parallel and by grade, and track their collection.
- **The differentiator**: every morning after a night of games, the "Last night" screen shows the stats of each player the user owns and how those games moved the value of their cards ("Flagg: 32 pts, your cards +8%"). This is the reason to open the app every day.
- **Business model**: freemium, MRR-driven, published on the Apple App Store and Google Play Store.
- **Target**: US collectors. American English UI, prices in US dollars.
- **Visual direction** (for later): sports video game aesthetic, dark, neon accents, "foil" card frames by rarity. Do not implement it now, but build a theming system (design tokens) that will support it.

Product name: TBD. Use a neutral codename (`courtvault`) in the code. Never use "NBA", a team name or any trademark in the product name, logo or branding.

### Domain vocabulary

- **Set**: a Topps product for a season (e.g. "2025-26 Topps Chrome").
- **Card**: a card in a set, identified by its number (e.g. #3 Cooper Flagg).
- **Parallel**: a variant of the same card (Base, Refractor, Gold /50, Red /5, Superfractor 1/1). "Base" is a parallel too.
- **Serial run / serial number**: limited print run. "12/50" = copy 12 of 50.
- **Grade**: certified condition. MVP: `RAW` (ungraded), `PSA9`, `PSA10`.
- **Rookie**: a player's first-year card, the most sought after.

### MVP scope

**In scope**: NBA basketball only. Topps 2025-26 sets (already released, already in collections) and Topps 2026-27 sets added as they release (2026-27 Flagship first).

**Out of scope (do not build)**: other sports, sets older than 2025-26, automatic parallel recognition from images, PSA/CGC label scanning, leaderboards and badges, user-to-user marketplace, sealed products.

---

## 2. Non-negotiable constraints

### Legal

- **No official imagery**: no player photos, no Topps artwork, no NBA or team logos. The only card images are photos taken by the user, **private by default**, never shown on the public website.
- Player **names and stats** are displayed as factual information only.
- **No scraping** (eBay, Trading Card Database, Beckett, etc.). Official APIs or files I provide only.
- "Not affiliated with the NBA, NBPA or Topps" in the website footer and the app's About screen.

### Data (100% free for the MVP)

| Data | Source | Notes |
| --- | --- | --- |
| Catalog (sets, cards, parallels) | Official Topps checklists, imported with a CSV script | CSV format below |
| Game stats | Highlightly (`https://nba.highlightly.net`, header `x-rapidapi-key`, free plan: 100 requests/day) | Check the docs that box scores are included in the free plan; if not, flag it |
| Prices | eBay Browse API, **active** listings (OAuth client credentials, marketplace `EBAY_US`) | These are **asking prices**, not sold prices. Label them everywhere: "Median asking price" |
| Buy links | eBay Partner Network (affiliate) via the `X-EBAY-C-ENDUSERCTX` header | Optional when no campaign ID is set |

Every external source goes through an **interface** with two implementations: the real one and a deterministic **mock**, selected by environment variable. Without keys, the whole project runs in mock mode. Later I will swap the price source for a paid sold-price provider: that change must touch a single file.

### Monetization

| | Free | Premium |
| --- | --- | --- |
| Cards in collection | 300 | Unlimited |
| Scans | Unlimited | Unlimited |
| Players followed in "Last night" | 3 | Unlimited |
| Price alerts | 2 | Unlimited |
| Followed checklists | 1 | Unlimited |
| Price history | 30 days | Full |
| Gains/losses, CSV export | No | Yes |

- Premium: $5.99/month or $39.99/year, 7-day free trial on the annual plan, managed by RevenueCat.
- Limits live **in the database** (a `plan_limits` table) and are **enforced by the database** (triggers and functions), so they cannot be bypassed from a client. The app reads them for display, it never decides them.
- When a limit is hit, the database raises an error with a stable, parseable code (e.g. `LIMIT_REACHED:cards`). The app intercepts it and opens the paywall.
- Users can never write their own Premium status: only the RevenueCat webhook (service role) can.

### App stores

- Sign in with Apple is required on iOS whenever Google sign-in is offered.
- Digital purchases only through in-app purchases (RevenueCat).
- Legal screens: terms, privacy, account deletion (required by both stores).

---

## 3. Target architecture

### Repository (pnpm workspaces)

```
courtvault/
  apps/
    web/        Next.js (App Router): SEO catalog website, deployed on Netlify
    mobile/     Angular + Ionic + Capacitor: iOS and Android app
  packages/
    shared/     generated database types, domain helpers, formatting, constants
  supabase/
    config.toml
    migrations/   SQL: schema, RLS policies, triggers, views, functions, cron schedules
    seed.sql      plan limits + dev seed (or a seed script)
    tests/        pgTAP tests (RLS, limits, calculations)
    functions/
      _shared/      provider interfaces + real and mock implementations, helpers
      scan-match/
      revenuecat-webhook/
      job-stats/
      job-prices/
      job-alerts/
      job-morning/
      export-csv/
      delete-account/
  scripts/
    import-checklist.ts
  data/
    checklists/   sample set CSVs for dev
  .github/workflows/   CI
  CLAUDE.md
  README.md
```

Current Node LTS, strict TypeScript everywhere (Deno for edge functions), current stable versions of Angular, Ionic, Capacitor, Next.js and the Supabase CLI (check them at install time). Local development uses the **Supabase CLI local stack** (`supabase start`), no separate docker-compose.

### How the pieces connect

```
Topps CSV ──► import script (service role) ──┐
                                             ▼
Supabase Cron ──► job-stats   ◄── Highlightly
              ──► job-prices  ◄── eBay Browse      ──► PostgreSQL (RLS, triggers, views, RPC)
              ──► job-alerts  ──► FCM                     ▲            ▲
              ──► job-morning ──► FCM                     │            │
RevenueCat ──► revenuecat-webhook ────────────────────────┘            │
                                                                       │
             apps/web (anon key, read-only public data) ───────────────┤
             apps/mobile (user session) ──► tables, RPC, storage, ─────┘
                                            scan-match, export-csv, delete-account
```

- Database types are generated with `supabase gen types typescript` into `packages/shared` and used by the website, the app and the edge functions.
- All business logic (collection value, value change, limits, morning report) lives in SQL functions and views or in edge functions, never duplicated in the clients.

### Database (`supabase/migrations`)

Tables (snake_case):

- `players`: id, slug, name, team, highlightly_id.
- `card_sets`: id, slug, name, season ("2025-26"), release_date.
- `cards`: id, slug, set_id, player_id, number, is_rookie. Unique (set_id, number).
- `parallels`: id, card_id, name, serial_run (nullable). Unique (card_id, name).
- `profiles`: id (= auth.users.id), email, is_premium, premium_until, push_token, created_at. Created automatically by a trigger on sign-up.
- `collection_items`: id, user_id, parallel_id, grade, serial_number, purchase_cents, photo_path, created_at.
- `price_points`: id, parallel_id, grade, source, price_cents, sample_size, buy_url, captured_at. Index (parallel_id, grade, captured_at).
- `games`: id, external_id, game_day (US Eastern day), home_team, away_team, status.
- `player_game_lines`: id, game_id, player_id, minutes, points, rebounds, assists, steals, blocks, raw (jsonb). Unique (game_id, player_id).
- `followed_players` (user_id, player_id), `checklist_follows` (user_id, set_id), `price_alerts` (user_id, parallel_id, grade, below_cents, triggered_at), `waitlist` (email, source, created_at).
- `plan_limits` (key, free_value), `job_runs` (job, run_key, status, started_at, finished_at, error).

Money is **always stored in cents** (integers). Game dates use the US Eastern day. `grade` is an enum (`RAW`, `PSA9`, `PSA10`).

Row Level Security on every table:

- Catalog, prices, games, stat lines, plan limits: public read, no client writes.
- User tables (`collection_items`, follows, alerts, checklist follows): a user reads and writes only their own rows.
- `profiles`: a user reads their own row and may update only `push_token`. `is_premium` and `premium_until` are writable by the service role only.
- `waitlist`: anonymous insert only.

Limit triggers on `collection_items`, `followed_players`, `price_alerts` and `checklist_follows`: refuse the insert when a non-Premium user is at their limit, raising `LIMIT_REACHED:<key>`.

SQL functions (RPC) and views:

- `latest_prices` view: last price per parallel and grade.
- `collection_summary()`: total value, 24h change split into "market" (price moves) and "added" (new cards).
- `price_history(parallel_id, grade)`: 30 days for free users, full history for Premium.
- `morning_report(day)`: for each owned player who played that day, their stat line and the value change of the user's cards.
- `search_catalog(q)`: search across players, sets and cards.
- `rookie_rankings()`: most valuable rookie cards.

Storage: a private `card-photos` bucket, one folder per user, RLS so users only access their own files, displayed through signed URLs. Store **compressed thumbnails only** (resize and compress on the device before upload, target under 100 KB), never full-size photos.

### Staying within Supabase Free

The free plan has hard limits (around 500 MB database, 1 GB file storage, 500,000 edge function invocations per month) and **pauses a project after 7 days of inactivity**. Design for it from day one:

- **Compact price history**: write a new `price_points` row only when the price actually changes; keep daily points for 90 days, then roll older data into one point per week (scheduled job). Estimate the database size at 1,000, 10,000 and 50,000 tracked parallels and report it.
- **Photo budget**: thumbnails only, as above, plus a per-user photo cap enforced in the database.
- **Pause risk**: find out what counts as activity for Supabase's inactivity pause and whether the scheduled jobs and real traffic are enough to prevent it; if not, propose a reliable keep-alive. Tell me clearly if the free plan is unsafe for production so I can plan the switch to Pro.
- **Usage dashboard**: a simple SQL view or script that reports database size, storage used and function invocations, so I can see when I approach the limits.

### Edge functions (`supabase/functions`)

- `scan-match`: input `{ text }` from on-device OCR (card back). Extract candidate card numbers, season (`20\d\d-\d\d`), serial run (`\d+/\d+`) and player names found in the database; return ranked candidate cards with their parallels, filtered by serial run when one is read. Unit tests with several realistic, noisy OCR samples.
- `revenuecat-webhook`: verifies the `Authorization` header secret, updates `is_premium` and `premium_until` from purchase, renewal, cancellation and expiration events.
- `job-stats`: previous night's games, then each game's box score; upserts `games` and `player_game_lines`. Respects rate limits, retries, logs.
- `job-prices`: prices only parallels present in at least one collection or alert, plus the top rookie cards. Median after removing outliers; query built from season, set, player, number, parallel and grade.
- `job-alerts`: checks price alerts and sends notifications.
- `job-morning`: sends the morning notification to every user with at least one owned player who played the night before.
- `export-csv`: Premium only, returns the user's collection as CSV.
- `delete-account`: deletes the user's data, photos and auth account (store requirement).

Provider interfaces in `_shared`: `StatsProvider` (Highlightly + mock), `PriceProvider` (eBay Browse + mock), `PushProvider` (Firebase Cloud Messaging + log). Selected by `STATS_PROVIDER`, `PRICE_PROVIDER`, `PUSH_PROVIDER`.

### Scheduled jobs (Supabase Cron)

Schedule each job function with Supabase Cron (pg_cron + pg_net). Target times in America/New_York: stats 5:00 AM, prices 5:30 AM, alerts 6:00 AM, morning notification 8:00 AM. pg_cron runs in UTC: handle daylight saving time explicitly (for example, schedule both UTC offsets and make every job **idempotent**, guarded by `job_runs` with a run key per US Eastern day). Every job can also be triggered manually in dev with a pnpm script.

### Website (`apps/web`)

Next.js App Router, deployed on **Netlify** (free plan, commercial use allowed). Reads Supabase with the anon key on the server only (public data).

Netlify Free runs on a monthly credit pool (around 300 credits) shared by deploys, bandwidth and functions, and pauses the site when it runs out. Design for it:

- Mostly static pages with incremental regeneration (ISR) and on-demand revalidation when data changes. Never trigger a full redeploy for data updates.
- Long cache headers on static assets and pages, optimized and lazy-loaded assets, no heavy client JavaScript.
- Only stable Next.js features well supported on Netlify; avoid experimental ones (e.g. Partial Prerendering).
- Disable deploy previews or limit them, since they consume credits.
- Check Netlify's current credit costs and tell me the estimated monthly consumption.

- Pages: home (search + trending rookies), `/cards/[slug]`, `/players/[slug]`, `/sets/[slug]`, `/rankings/rookies`, `/waitlist`, legal pages.
- Technical SEO from day one: `generateMetadata` per page, canonical tags, dynamic `sitemap.xml`, `robots.txt`, schema.org structured data (`Product` with `AggregateOffer` for listing prices, `BreadcrumbList`), iOS smart app banner (`apple-itunes-app`) and deep links into the app.
- Every page shows a call to action toward the app (or the waitlist until the app is published).
- Use the available SEO skills (e.g. `seo-audit`) to validate these choices. Design will come with the mockups: for now, simple, accessible layouts built on theme tokens.

### App (`apps/mobile`)

Angular (standalone components, signals, lazy loading) + Ionic + Capacitor, iOS and Android. Talks to Supabase directly with `@supabase/supabase-js` and the user's session, through a thin set of Angular services (one per domain: catalog, collection, scan, morning, follows, alerts, billing). Components never call Supabase directly.

| Need | Building block |
| --- | --- |
| Camera | `@capacitor/camera` |
| On-device OCR | Capacitor ML Kit Text Recognition plugin. Check it is maintained and compatible with your Capacitor version; otherwise write a small native plugin (ML Kit on Android, Vision on iOS) |
| Auth | Supabase Auth: Sign in with Apple, Google, email one-time code |
| Subscriptions | RevenueCat (`@revenuecat/purchases-capacitor`), app user ID = Supabase user ID |
| Notifications | `@capacitor/push-notifications` + Firebase Cloud Messaging |
| Deep links | Universal Links and App Links via `@capacitor/app` |
| Photos | Supabase Storage, private bucket |

Screens and routes (functional skeletons, wired to Supabase):

1. **Onboarding**: sign in, pick 3 favorite players, prompt for the first scan.
2. **Scan**: photo of the card back → OCR → `scan-match` → suggested card → parallel grid → add. Burst mode with a running count and total value. Manual search fallback when OCR fails.
3. **Vault** (collection): total value, change, filters, list.
4. **Card**: price by grade, history, gain/loss, alert, affiliate buy button.
5. **Last night**: morning report.
6. **Sets**: followed checklists, completion.
7. **Paywall**: RevenueCat offerings, trial, restore purchases.
8. **Profile**: account, Premium, notifications, legal, account deletion.

Tab navigation: Last night, Vault, Scan (center), Sets, Profile.

- Ask for notification permission **after the first scan**, never at launch.
- A global error handler maps `LIMIT_REACHED:<key>` to opening the paywall.
- Theming: every color, font, radius and shadow goes through Ionic CSS variables in a single tokens file. The mockups should only need to change that file and the templates.

### Checklist CSV format

```
season,set_slug,set_name,card_number,player_name,team,is_rookie,parallels
2025-26,2025-26-topps-chrome,Topps Chrome,3,Cooper Flagg,Dallas Mavericks,true,Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1
```

`parallels`: `|`-separated list, serial run after `/`. The import (service role key, run locally or from CI) is idempotent: re-running creates no duplicates. Create a sample CSV with about ten cards across 2025-26 and 2026-27, plus a seed that generates consistent mock prices and stats so "Last night" renders locally.

---

## 4. Environment and tooling

- One documented `.env.example` per app and for the edge functions. No secrets in code; the service role key is never shipped to a client.
- Key variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (scripts and functions only), `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_AFFILIATE_CAMPAIGN_ID`, `HIGHLIGHTLY_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `FCM_*`, `PRICE_PROVIDER=mock|ebay`, `STATS_PROVIDER=mock|highlightly`, `PUSH_PROVIDER=log|fcm`, `FREE_CARD_LIMIT_OVERRIDE` (dev only).
- Root scripts: `pnpm dev` (local Supabase + functions + website + app), `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm db:reset` (migrations + seed), `pnpm db:types`, `pnpm import:checklist <file>`, `pnpm job:<name>`.
- GitHub Actions CI: install, lint, typecheck, pgTAP tests, Deno tests, build.
- Tests: RLS policies, limit triggers, `collection_summary` and `morning_report` (pgTAP); OCR matching, Highlightly and eBay mapping with recorded responses, RevenueCat webhook (Deno); CSV parsing.

---

## 5. Execution order

1. Monorepo, tooling, CI, Supabase local stack, `packages/shared`.
2. Migrations: schema, RLS, triggers, views, RPC; CSV import; seed; generated types; pgTAP tests.
3. Edge functions with mock providers, then real providers; cron schedules; idempotent jobs.
4. Website: pages, technical SEO, waitlist.
5. App: navigation, auth, scan, Vault, Card, Last night, Sets, paywall, profile, push, deep links.
6. `README.md` and `CLAUDE.md` up to date.

After each step: typecheck and tests green, a clear commit, a short summary of what's done and what's left.

---

## 6. CLAUDE.md

Create or update `CLAUDE.md` at the root, in English, so any future session understands the project without this prompt: product summary, vocabulary, legal and data constraints, plan limits, architecture, commands, conventions. If a `CLAUDE.md` already exists (possibly in French, possibly describing a NestJS backend), rewrite it in English from this brief; where they conflict, this brief wins (notably: Supabase as the only backend, Netlify for the website, 2025-26 **and** 2026-27 sets, app built with Angular + Ionic + Capacitor).

Add this rule for the design phase: when the mockups arrive, use the `frontend-design` skill, then `ui-ux-pro-max`, for the screens, and the SEO skills for the website, changing the theme tokens and templates without touching the wiring.

Also document the escape hatch: if business logic outgrows SQL and edge functions, a dedicated backend can be added later on top of the same database.

---

## 7. Definition of done for this session

- `pnpm dev` starts local Supabase, the edge functions, the website and the app (in the browser) with no external keys, in mock mode.
- Website: a set, card and player page render with seed data, the sitemap lists every page, the waitlist stores an email.
- App (browser and at least one simulator): sign in, add a card (simulated scan when no camera is available), collection with value, card page, "Last night" screen filled by the seed, paywall triggered when the card limit is hit (lowerable in dev with `FREE_CARD_LIMIT_OVERRIDE`).
- RLS verified: a user cannot read another user's collection or grant themselves Premium.
- Jobs run manually in mock mode and, when keys are present, with the real providers; cron schedules are in the migrations.
- CI green, README explaining setup from A to Z (including creating the Supabase project, Netlify deployment and free-tier limits to watch), `CLAUDE.md` up to date.

---

## 8. How you work

- Start by presenting your plan and open questions. Wait for my approval.
- Small commits, one feature at a time.
- Never guess on legal matters, licenses or API terms: stop and ask.
- If a library recommended here is abandoned or incompatible, propose an alternative before adopting it.
- Check current Supabase Free and Netlify Free limits and tell me if anything in this design risks exceeding them.
- Build nothing from the "Out of scope" list.
- At the end, give me the list of what remains before the mockups and before store submission.
