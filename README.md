# HoopTicker

Catalog website and mobile app for basketball trading card collectors in the United States.
The website captures search traffic with one page per card, player and set. The app scans a
card, shows its value by parallel and grade, tracks a collection, and every morning shows how
last night's games moved the value of the user's cards.

The product is **HoopTicker** (`BRAND_NAME` in `packages/shared`). `courtvault` stays as the technical codename in package names, database objects and the repo. Not affiliated with the NBA, NBPA or Topps.

- **Backend**: Supabase only (Postgres, Auth, Storage, Edge Functions, pg_cron). No custom server.
- **Website**: Next.js (App Router) on Netlify Free.
- **App**: Angular + Ionic + Capacitor (iOS and Android).
- **Shared**: generated database types and domain helpers in `packages/shared`.

See `CLAUDE.md` for the product brief, constraints and conventions.

## Prerequisites

| Tool               | Version           | Install                                                           |
| ------------------ | ----------------- | ----------------------------------------------------------------- |
| Node.js            | 22.22+ (`.nvmrc`) | `nvm install`                                                     |
| pnpm               | 10                | `npm i -g pnpm`                                                   |
| Docker Desktop     | current           | docker.com                                                        |
| Supabase CLI       | 2.x               | `brew install supabase/tap/supabase`                              |
| Deno               | 2.x               | `brew install deno`                                               |
| Android (optional) | SDK 35/36, JDK 21 | Android Studio, or `brew install --cask android-commandlinetools` |
| Xcode (optional)   | current           | App Store, iOS only                                               |

## Quick start (no external keys, mock mode)

```bash
pnpm install
pnpm db:start          # local Supabase (first run downloads Docker images)
pnpm db:reset          # migrations + seed (demo catalog, prices, games, demo users)
pnpm db:types          # regenerate packages/shared/src/database.types.ts
pnpm dev               # functions + website (3000) + app (4200)
```

`pnpm dev` creates the local `.env` files from the `.env.example` files when they are missing.
The local anon and service role keys printed by `supabase status` are the same on every machine.

| URL                    | What                                         |
| ---------------------- | -------------------------------------------- |
| http://localhost:4200  | App in the browser (scan is simulated)       |
| http://localhost:3000  | Website                                      |
| http://127.0.0.1:54323 | Supabase Studio                              |
| http://127.0.0.1:54324 | Mailpit: the 6-digit sign-in codes land here |

Demo users: `demo@courtvault.local` (collection, follows, one alert) and `other@courtvault.local`.
Sign in with any email: the code is in Mailpit. The seed generates games for "last night"
relative to the day it runs, so run `pnpm db:reset` again on a new day (or `pnpm job:stats`).

### Everyday commands

```bash
pnpm lint | pnpm typecheck | pnpm test | pnpm build
pnpm test:db                       # pgTAP (RLS, limits, calculations, compaction)
pnpm test:functions                # Deno tests (providers, OCR matcher, webhook)
pnpm import:checklist data/checklists/DEMO-2025-26-topps-chrome.csv   # idempotent
pnpm job:stats | job:prices | job:alerts | job:morning | job:compact  # run a job now
pnpm job:stats -- --force --day=2026-10-04                            # ignore the hour gate, rerun a day
pnpm db:usage                      # free-tier usage report
FREE_CARD_LIMIT_OVERRIDE=5 pnpm db:reset   # lower the free card limit to test the paywall
```

### Real providers

Set in `supabase/functions/.env` (local) or as function secrets (cloud):

| Variable         | Values                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `STATS_PROVIDER` | `mock` or `highlightly` (+ `HIGHLIGHTLY_API_KEY`)                                                  |
| `PRICE_PROVIDER` | `mock` or `ebay` (+ `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, optional `EBAY_AFFILIATE_CAMPAIGN_ID`) |
| `PUSH_PROVIDER`  | `log` or `fcm` (+ `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`)                         |

Prices come from the eBay Browse API **active listings**: they are asking prices and are
labeled "Median asking price" everywhere. Swapping to a sold-price provider means adding a
class in `supabase/functions/_shared/providers/prices.ts` and selecting it with `PRICE_PROVIDER`.

### Android emulator

```bash
cd apps/mobile
# .env: SUPABASE_URL=http://10.0.2.2:54321 (the emulator's alias for the host machine)
pnpm build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`capacitor.config.ts` sets `android.allowMixedContent: true` so the https app shell can call the
local http Supabase. Turn it off for production builds. Use a hardware GPU for the emulator
(`-gpu host`): the software renderer shows ghosted layouts.

## Repository layout

```
apps/web          Next.js website (Netlify)
apps/mobile       Angular + Ionic + Capacitor app (android/ and ios/ are generated, not committed)
packages/shared   database types, money/date/slug helpers, LIMIT_REACHED parser
supabase/
  migrations/     schema, RLS, triggers, views, RPC, storage, cron, usage
  seed.sql        plan limits, Vault secrets (local), demo data
  tests/          pgTAP
  functions/      edge functions + _shared providers (real + mock)
  templates/      auth email template (6-digit code)
scripts/          checklist import, job runner, usage report, dev launcher
data/checklists/  DEMO-*.csv (hand-written demo data, replaced by official checklists)
.github/workflows CI and Supabase keep-alive
```

## Database model

Catalog: `players`, `card_sets`, `cards` (unique set + number), `parallels` (unique card +
name, `serial_run` nullable). Users: `profiles` (created by trigger), `collection_items`,
`followed_players`, `checklist_follows`, `price_alerts`, `waitlist`. Market: `price_points`
(compact history, one row per actual change), `current_prices` (last price per parallel and
grade, exposed as the `latest_prices` view), `games`, `player_game_lines`. Ops: `plan_limits`,
`job_runs`.

Money is in integer cents. Game days are US Eastern dates. `grade` is `RAW | PSA9 | PSA10`.

RPC for clients: `collection_summary()`, `price_history(parallel_id, grade)`,
`morning_report(day)`, `search_catalog(q)`, `rookie_rankings(limit)`, `set_progress()`,
`collection_export()`, plus the `collection_items_detailed` view. Public (anon):
`public_last_night(day, min_sample, min_price_cents)` and `public_last_night_days()` for the
website's daily "Last night" page and its archive. Service role only: `record_price`, `parallels_to_price`,
`morning_report_for`, `morning_recipients`, `start_job_run` / `finish_job_run`,
`compact_price_points`, `usage_report`, `invoke_job`.

### Plan limits

`plan_limits` holds the free (and optional premium) values. Triggers on `collection_items`,
`followed_players`, `price_alerts` and `checklist_follows` raise `LIMIT_REACHED:<key>`; the
storage insert policy enforces the photo cap; `price_points` RLS hides history older than the
free window. The app maps `LIMIT_REACHED:*` to the paywall. Only the RevenueCat webhook
(service role) writes `profiles.is_premium` / `premium_until`.

## Scheduled jobs

pg_cron (UTC) calls the edge functions through pg_net with the `x-job-secret` header. Each job
is scheduled at both Eastern offsets (EST and EDT); the function skips when the local hour is
before its target and is idempotent per Eastern day via `job_runs`.

| Job                             | Target (New York) | Cron (UTC)      |
| ------------------------------- | ----------------- | --------------- |
| job-stats                       | 5:00              | `0 9,10 * * *`  |
| job-prices                      | 5:30              | `30 9,10 * * *` |
| job-alerts                      | 6:00              | `0 10,11 * * *` |
| job-morning                     | 8:00              | `0 12,13 * * *` |
| compact-price-points (SQL only) | weekly            | `0 11 * * 0`    |

Price coverage: user pairs (collections, alerts) first, then the showcase (players who played
last night, rookies, top 60 players by recent performance), capped by
`app_settings.showcase.daily_call_budget` (3,500 by default; the eBay Browse quota is 5,000
calls/day). Expected load per night with the two 2025-26 sets: rookies ~390 pairs (98 cards ×
Base in Raw and PSA 10 + 2 parallels), top players ~360, players of the night mostly overlap;
about 800 to 1,600 calls. `price_coverage` keeps a per-reason log; edit the settings in Studio.

Morning email digest (`job-morning`, after the push): daily for Premium, weekly on Monday
for free users, `off` respected; recipients from `morning_email_recipients()`, Premium first,
capped by `EMAIL_DAILY_BUDGET` per run (Brevo free plan: 300 emails/day shared with the auth
SMTP). Every email carries RFC 8058 one-click unsubscribe headers pointing at the
`unsubscribe` function (token per profile, scopes `digest`, `marketing`, `all`) and the postal
address from `EMAIL_POSTAL_ADDRESS`. `EMAIL_PROVIDER=log` prints instead of sending.

Cron accounts for about 8 edge invocations per day (two firings per job, the second is a
no-op), far below the 500k/month free quota. App traffic (scan-match, export, delete) adds to it.

## Cloud setup from A to Z

### 1. Supabase project

1. Create a project at supabase.com (Free plan). Note the project ref, anon key and service role key.
2. `supabase login`, then `supabase link --project-ref <ref>`.
3. `supabase db push` applies `supabase/migrations`. If `create extension pg_cron` or `pg_net`
   fails, enable them in Dashboard > Database > Extensions and push again.
4. Seed production data (plan limits and Vault secrets only, never the demo data):
   ```sql
   insert into public.plan_limits (key, free_value, premium_value, description) values
     ('cards', 300, null, 'Cards in collection'),
     ('followed_players', 3, null, 'Players followed in "Last night"'),
     ('price_alerts', 2, null, 'Price alerts'),
     ('checklist_follows', 1, null, 'Followed checklists'),
     ('price_history_days', 30, null, 'Days of price history visible'),
     ('photos', 300, 1000, 'Card photos stored');
   select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'functions_url');
   select vault.create_secret('<long random string>', 'job_secret');
   ```
5. Auth: Dashboard > Authentication. Email provider on, "Confirm email" off, Magic Link
   template = `supabase/templates/magic_link.html` with subject "Your sign-in code".
   **Custom SMTP is mandatory in production**: Supabase's built-in sender allows a few emails
   per hour. Use Brevo (free plan 300 emails/day, shared with the digest): host
   `smtp-relay.brevo.com`, port 587, the SMTP login and key from Brevo, sender
   `hello@hoopticker.com` on a verified domain. Add the Google provider (web client id, also
   set as `GOOGLE_WEB_CLIENT_ID` in the app) and the Apple provider (Services ID, team id,
   key id, private key; then `APPLE_SIGN_IN_ENABLED=true` in the app). Redirect URLs:
   `https://vault.hoopticker.com/auth/callback`, the website origin and `hoopticker://auth/callback`.
6. Functions: `supabase functions deploy`, then
   `supabase secrets set --env-file supabase/functions/.env` with the production values.
   `JOB_SECRET` must equal the Vault `job_secret`.
7. Import the catalog: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm import:checklist data/checklists/<file>.csv`.
8. GitHub repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the keep-alive workflow.

### 2. Netlify (website)

1. New site from the GitHub repo. Set the package directory to `apps/web`; build command and
   plugin come from `apps/web/netlify.toml`.
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL` (https origin), `REVALIDATE_SECRET`, later `NEXT_PUBLIC_APPLE_APP_ID`.
3. Deploy previews and branch deploys are disabled in `netlify.toml` because they cost credits.
4. Set `WEB_REVALIDATE_URL=https://<site>/api/revalidate` and `WEB_REVALIDATE_SECRET` as
   function secrets so price updates refresh pages without a redeploy.

### 3. Stripe (web checkout)

Products and prices in Stripe (test mode first) carrying the amounts of `PRICING`:
`premium_monthly` $5.99/month, `premium_yearly` $49.99/year (the 7-day trial is set on the
Checkout session), `founders_lifetime` $149 one-time. Function secrets: `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_PRICE_LIFETIME`.
Webhook endpoint `https://<ref>.supabase.co/functions/v1/stripe-webhook` with the events
`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`. Customer Portal enabled in the Stripe dashboard (cancel,
change plan, invoices). The webhook is the second service-role writer of `profiles.is_premium`
next to RevenueCat; events are deduplicated in `billing_events`. Founder's Lifetime: flag,
end date and cap in `app_settings.founders_lifetime`, real count in `lifetime_purchases`,
public `founders_lifetime_status()`.

### 4. RevenueCat

Create the app (iOS + Android), products `premium_monthly` ($5.99), `premium_yearly`
($49.99 with a 7-day trial) and the non-consumable `founders_lifetime` ($149), the entitlement
`premium` and a default offering. The amounts live in `PRICING` (`packages/shared`); a test pins them. Webhook URL:
`https://<ref>.supabase.co/functions/v1/revenuecat-webhook`, Authorization header value equal
to `REVENUECAT_WEBHOOK_SECRET`. The app user id is the Supabase user id (set by the app).

### 5. Mobile builds

```bash
cd apps/mobile
pnpm build && npx cap sync
npx cap open android      # Android Studio
npx cap open ios          # Xcode (macOS), after `npx cap add ios`
```

Deep links: host `apple-app-site-association` and `.well-known/assetlinks.json` on the website
(`apps/web/public/.well-known/`) once the bundle ids and certificates exist. Push: add
`google-services.json` / `GoogleService-Info.plist` from Firebase.

## Free-tier limits to watch

**Supabase Free**: about 500 MB database, 1 GB storage, 500k edge invocations/month, pause
after 7 days without API or database activity. `pnpm db:usage` prints the current numbers.

Price history size, measured on the seed: 160 bytes per `price_points` row including the index
(no surrogate key). Year one per tracked parallel and grade: about 90 daily points + 39 weekly
points = 129 rows = 21 KB, then about 12 monthly rows per year. With about 1.5 priced grades
per tracked parallel:

| Tracked parallels | price_points after 1 year | Verdict                                         |
| ----------------- | ------------------------- | ----------------------------------------------- |
| 1,000             | ~31 MB                    | fine                                            |
| 10,000            | ~310 MB                   | ~65% of the free database, plan the move to Pro |
| 50,000            | ~1.5 GB                   | needs Supabase Pro (8 GB included)              |

Only parallels in a collection or an alert plus the top rookies are priced, so tracked
parallels grow with users, not with the catalog.

Photos: thumbnails under 100 KB (200 KB hard cap), 300 per free user, 1,000 per premium user.
1 GB holds roughly 10,000 photos: watch `storage_size` in the usage report.

**Pause risk**: the daily cron jobs call the edge functions, which query the database through
the API, and that counts as activity. `keepalive.yml` additionally hits the REST API every day
from GitHub Actions. A paused project stops the jobs and the app, so for a published app with
paying users Supabase Pro ($25/month, no pausing, daily backups) is the safe choice. The free
plan is fine for development and a soft launch.

**Netlify Free**: 300 credits/month with no overage (the site goes down when they run out).
Production deploy 15 credits, bandwidth 20 credits/GB, 2 credits per 10k requests, function
compute 10 credits/GB-hour. Estimate for the first months: 4 deploys (60) + 5 GB bandwidth
(100) + 200k requests (40) + ISR function time (~20) = about 220 credits. Keep deploys rare
(data changes revalidate pages, they never redeploy) and assets light.

## Testing

- `pnpm test:db`: RLS (cross-user reads, premium self-grant, waitlist, price window), limit
  triggers, `collection_summary`, `morning_report`, `record_price`, compaction.
- `pnpm test:functions`: Highlightly and eBay mapping with recorded responses, mock
  determinism, OCR matcher with noisy samples, RevenueCat events, Eastern-day helpers.
- `pnpm --filter @courtvault/scripts test`: checklist CSV parsing.
- CI (`.github/workflows/ci.yml`): lint, typecheck, unit and Deno tests, builds, and a
  database job (migrations + pgTAP on a fresh local stack).
