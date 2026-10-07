# Plan: HoopTicker web version and SEO acquisition machine

Written 2026-10-07, decisions recorded the same day. Rules are referenced by number from
`docs/seo-rules.md`. Phase 1 deliverables: `docs/keyword-map.csv`, `docs/keyword-map.md`,
`docs/site-architecture.md`.

## Decisions (2026-10-07)

1. Visual direction: dark neon was tried on 2026-10-07 and reverted the same day by Martin.
   The app keeps the **light cool off-white canvas, lime accent and Outfit** direction of
   2026-10-06 (CLAUDE.md). Foil frames by rarity stay, toned for the light canvas.
2. Keyword volumes: Martin sends a Google Keyword Planner export. Volumes stay `TBD` until
   then.
3. Slugs: proposals accepted as pending; frozen only after the volumes are in.
4. Web app hosting: **Cloudflare Pages** for `vault.hoopticker.com`; Netlify credits stay
   with the public website.
5. Email: **Brevo** (300/day free) for login codes and digests, with the rule "daily digest
   for Premium, weekly for free".
6. Paying referrers: bank the free months, grant them when the paid period ends.
7. Creators: free Premium at launch, flat bounty later.
8. Rename: keep `@courtvault/*` packages, database names and the repo; switch the bundle id
   and the URL scheme to HoopTicker now.
9. Founder's Lifetime: sold on web, iOS and Android.
10. About and trust pages: placeholders until Martin sends bio, photo, legal entity, address
    and contact email.
11. AI-assisted guide drafts: allowed, always marked for Martin's review, never published
    without it.
12. (later on 2026-10-07) Web checkout goes through **Stripe directly** (hosted Checkout +
    Customer Portal), not RevenueCat Web Billing. A `stripe-webhook` edge function becomes the
    second service-role writer of `profiles.is_premium` next to `revenuecat-webhook`; the
    database stays the single source of Premium for every platform. RevenueCat keeps the App
    Store and Google Play purchases.

## 0. What I found in the repo before planning

- Website: Next.js 16, 20 route files. Pages exist for home, sets, players, cards, rookie
  rankings, Last night (with archive and OG image), search, waitlist, three legal pages.
  Titles have no brand suffix (R27/R28 not applied), sitemap uses build time as `lastmod`
  (R50 violated), every card is in the sitemap regardless of data (R49/R55), robots.txt has no
  AI-crawler rules, `Product` markup is on card pages, `WebSite` on the homepage, no
  `SoftwareApplication` yet.
- Catalog: 600 cards (2 official 2025-26 sets of 300 cards), ~350 players, parallels from the
  official Topps collector's guides. No sealed products, no `/products/` route (the brief
  mentions one; it does not exist).
- App: Angular 22 + Ionic 9, phone layout only, bottom tabs (Last night, Vault, Scan, Sets,
  Profile). Email code sign-in works; Apple and Google are wired but hidden without keys and
  Apple is iOS-only in code. RevenueCat Capacitor SDK only (no web billing). No PostHog.
- Pricing constant: monthly $5.99, annual $39.99, trial 7 days, in `packages/shared`.
- Brand: `SITE_NAME = 'Courtvault'` on the website, "Courtvault"/codename in the app.

### Three conflicts between the brief, the rules and the repo

1. **Visual direction.** CLAUDE.md (applied 2026-10-06) fixes a light off-white canvas with a
   lime accent (`docs/img.png`). Section 2 of the brief says "sports video game aesthetic,
   dark, neon, foil frames by rarity". Both are token-only changes, but they are opposites.
   Open question 1.
2. **Annual price.** CLAUDE.md and the code say $39.99; the brief says $49.99 plus a $149
   Founder's Lifetime. The brief wins; CLAUDE.md, README and the constant are updated in
   phase 2 (R69, R72 checklist).
3. **Rules file vs brief on titles.** The rules say `[Keyword]: [promise] | Brand` (R27).
   The current layout deliberately omits the brand suffix. R27 wins.

## 1. Rename to HoopTicker

Recommendation:

- User-facing name comes from one constant, `BRAND_NAME = 'HoopTicker'`, in
  `packages/shared` (R69), with `BRAND_TAGLINE = 'Turn your basketball card collection into
a portfolio.'` and the differentiator line next to it. Website, app, emails, legal pages,
  structured data and Open Graph all import it.
- Keep `courtvault` where renaming is cost without user-facing benefit: pnpm package names
  (`@courtvault/*`), database objects, `APP_CODENAME`, the GitHub repo, env variable names.
- Change now, because they become permanent at store submission: the Capacitor app id
  (bundle id / Android application id), the deep link scheme (`courtvault://` becomes
  `hoopticker://`), the Android AVD name is irrelevant.
- After the rename: `grep -ri "courtvault"` over the repo, review every hit, keep only the
  technical ones listed above (R76). Same grep for "Courtvault", "codename", "TBD".

## 2. Two surfaces

| Surface | Host                  | Code                                           | Indexed |
| ------- | --------------------- | ---------------------------------------------- | ------- |
| Website | `hoopticker.com`       | `apps/web`                                     | Yes     |
| Web app | `vault.hoopticker.com` | `apps/mobile` built with the web configuration | No      |

- `.app` is an HTTPS-only TLD (HSTS preloaded): one canonical host, no www, no redirect
  chain (R56, R57). Trailing slash policy: none (R58).
- Web app: `<meta name="robots" content="noindex, nofollow">` in its `index.html` and a
  `robots.txt` with `Disallow: /` on the subdomain. The website's robots.txt cannot block
  another host, so the subdomain carries its own.
- Supabase Auth: `site_url` and redirect allow-list get `https://vault.hoopticker.com/auth/callback`
  and the localhost equivalents. Referral cookie is set on `.hoopticker.com` so the website
  can store it and the web app can read it.
- Hosting of the web app: a static SPA (no functions). Netlify Free credits are shared by
  the whole team, and the README already estimates about 220 of 300 credits for the website.
  Open question 4: a second Netlify site, or Cloudflare Pages (free, unlimited bandwidth,
  new vendor).

## 3. Phases

Each phase ends with tests green, a short summary and what is left. Phase 1 stops for your
review before anything else is built.

### Phase 1: keyword map, architecture, final slugs (stop for review)

Deliverables:

- `docs/keyword-map.csv` (source of truth, machine-checkable) and `docs/keyword-map.md`
  (same rows in the R7 table format). Columns: main keyword, variants, volume, intention,
  SERP top 3 type, page, status.
- `docs/site-architecture.md`: menu by journey (R19), category pages (R20), slug table
  current vs final, redirect list (none needed before launch: nothing is indexed yet, R25
  case "no position, rename immediately").

Keyword map method:

- Volumes stay `TBD` unless you provide data. I never invent them. If you authenticate the
  Ahrefs connector available in this session, I can pull US volumes and difficulty directly;
  otherwise paste a Keyword Planner or Semrush export and I merge it.
- SERP type of the top 3 (R10): I run each target query in Google through the Chrome tool and
  note the actor types (marketplace, forum, publisher, tool, official). About 60 to 80 queries.
- Intention classes per R11; pre-purchase and commercial first.
- Long tail first (R9): the domain is new. Queries where the top 3 holds eBay, PSA, Beckett
  and Cardboard Connection on every slot are marked "long term".
- One row per page, one page per row. Variants of the same intention stay on the row (R1).

Seed clusters and the page that owns each (final after volumes):

| Cluster                                                                                                                 | Owner page                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Commercial (basketball card scanner app, basketball card value app, basketball card collection tracker)                 | Homepage only (R5). The most searched formulation becomes the title and H1 (R6, R37). |
| Player (cooper flagg rookie card, wembanyama rookie card)                                                               | Player page                                                                           |
| Specific card (2025-26 topps chrome cooper flagg rookie)                                                                | Card page                                                                             |
| Set checklist (2025-26 topps chrome basketball checklist)                                                               | Set page                                                                              |
| Sealed (2025-26 topps chrome basketball hobby box)                                                                      | Sealed product page (new)                                                             |
| Rankings (most valuable basketball rookie cards 2026)                                                                   | Ranking page                                                                          |
| Daily (basketball card prices today, card movers)                                                                       | Last night page                                                                       |
| Guides (how to grade basketball cards, what is a refractor, psa 9 vs psa 10 value, are basketball cards worth anything) | One guide each                                                                        |
| Competitors (collx alternative, ludex vs collx, best app to scan sports cards)                                          | One comparison page each (R14)                                                        |
| Tools (is it worth grading my card, set completion cost)                                                                | One tool page each                                                                    |

Proposed slugs (R22: the domain carries no keyword words, so the path carries all of them):

| Page                               | Current                                      | Proposed                                                                                                    | Note                                                              |
| ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Set                                | `/sets/2025-26-topps-chrome`                 | `/checklists/2025-26-topps-chrome-basketball`                                                               | "checklist" and "basketball" are in the query                     |
| Sets hub                           | `/sets`                                      | `/checklists`                                                                                               | Category page (R20)                                               |
| Player with a rookie card in scope | `/players/cooper-flagg`                      | `/players/cooper-flagg-rookie-cards`                                                                        | Query "cooper flagg rookie card"                                  |
| Other player                       | `/players/lebron-james`                      | `/players/lebron-james-cards`                                                                               | Query "lebron james cards"                                        |
| Players hub                        | `/players`                                   | `/players`                                                                                                  | Category page                                                     |
| Card (rookie)                      | `/cards/2025-26-topps-chrome-3-cooper-flagg` | `/cards/2025-26-topps-chrome-cooper-flagg-rookie-card-3`                                                    | Number kept for uniqueness                                        |
| Card (other)                       | same pattern                                 | `/cards/2025-26-topps-chrome-lebron-james-card-50`                                                          |                                                                   |
| Rookie ranking                     | `/rankings/rookies`                          | `/most-valuable-basketball-rookie-cards`                                                                    | Year in the title only (R31, R73)                                 |
| Last night                         | `/last-night`, `/last-night/[date]`          | `/basketball-card-movers`, `/basketball-card-movers/[date]`                                                 | "Last night" is a product name (R23); final wording after volumes |
| Sealed                             | none                                         | `/sealed/2025-26-topps-chrome-basketball-hobby-box`, hub `/sealed`                                          | New                                                               |
| Guides                             | none                                         | `/guides/<keyword>`; hubs `/guides/<journey-step-keyword>`                                                  | Hub slugs from the map                                            |
| Comparisons                        | none                                         | `/compare/collx-alternative`, `/compare/ludex-vs-collx`                                                     |                                                                   |
| Tools                              | none                                         | `/tools/is-it-worth-grading-my-card`, `/tools/set-completion-cost-calculator`                               |                                                                   |
| Institutional                      | none                                         | `/about`, `/trust`, `/how-we-price-cards`, `/pricing`, `/roadmap`, `/press`, `/creators`, `/referral-terms` | Brand-only titles (R32)                                           |
| Not indexed                        |                                              | `/r/[code]`, `/u/[handle]`, `/embed/card/[slug]`, `/search`, `/waitlist`                                    | noindex, out of the sitemap                                       |

Slug values are stored in the database at import time (they never change after launch) and
are frozen with your approval (R25).

Menu (R19): **Card values** (Players, Checklists, Rookie rankings, Card movers), **Guides**
(Learn, Grade and sell, Protect and insure), **App** (links to `/pricing` and the web app).
Breadcrumbs visible and marked up on every page below the homepage (R21).

### Phase 2: web app (desktop layouts and web adaptations)

Layout:

- Breakpoints: phone (unchanged), tablet (≥ 768px), desktop (≥ 1024px). Desktop uses
  Ionic's split pane: persistent sidebar (Last night, Vault, Sets, Search, Profile), content
  area with multi-column grids, charts at full width.
- Vault on desktop: a data table component (sortable columns player, set, parallel, grade,
  value, 24h change, gain/loss; filters; search; multi-select with bulk grade change, delete,
  export). Phone keeps the current list. Both read the same `CollectionService` signals.
- Keyboard shortcuts service: `/` search, `a` add card, `j`/`k` next and previous, `?` help.
- Tokens only, templates only. `frontend-design` then `ui-ux-pro-max` review per screen,
  after open question 1 is settled.

Features:

- Manual search first: autocomplete over `search_catalog` (player, set, number), then grade
  and parallel pickers. Capacitor-only plugins (camera, ML Kit, push, haptics) are guarded by
  `Capacitor.isNativePlatform()`.
- Optional webcam / upload scanner: Tesseract.js loaded by dynamic import only when the
  scanner opens (R63). Accuracy measured against the existing noisy OCR fixtures of the Deno
  matcher tests plus 20 real photos of card backs I take from public domain reference images
  (never player likenesses). Reported as a table; hidden behind an `app_settings` flag if
  below the native matcher.
- CSV import: file parsed in the browser (PapaParse, lazy), column mapping UI, matching by a
  new SQL function `match_import_rows(rows jsonb)` (same catalog logic for everyone, per
  CLAUDE.md), preview, confirm. Insert goes through `import_collection(rows)` which stops at
  the free limit, returns inserted / skipped counts and raises `LIMIT_REACHED:cards` so the
  paywall opens; unmatched rows go to a review list stored in `import_reviews`.
- Morning email digest: see section 5.
- Web checkout: RevenueCat Web Billing (Stripe behind it). The `purchases-js` SDK is loaded
  only when the paywall opens. App user id = Supabase user id, so the existing webhook keeps
  working. Web Billing supports auto-renewing subscriptions and non-consumable one-time
  purchases, which covers the Founder's Lifetime plan (verified in the RevenueCat docs on
  2026-10-07).
- No link from the iOS or Android app to the web checkout until you approve it.
- Sign-in: Google first on web and Android, Apple first on iOS, both shown when configured
  (Apple on the web via Supabase's Apple provider); email code always works. Terms line under
  the buttons, one unchecked marketing consent checkbox stored as
  `profiles.marketing_consent_at`, one "Already have an account? Sign in" link. Login codes
  through custom SMTP in production (Supabase's built-in sender is limited to a few emails per
  hour).

Tests: Angular unit tests for the table sorting and the CSV mapper, pgTAP for
`import_collection` limits, Deno tests for the email provider mock and the webhook lifetime
event.

### Phase 3: website templates on the SEO rules

- Titles `[Keyword]: [promise] | HoopTicker`, ≤ 60 characters, from a `seo()` helper that also
  enforces 155-character descriptions (R27 to R34). A vitest "SEO lint" runs over every static
  route and every template with fixture data: keyword present in title, H1 and slug (R2), one
  H1, title length, description length, canonical absolute (R53).
- `page_index_status` SQL view: for every card, player and set, `indexable boolean` and
  `lastmod timestamptz` (section 4). Sitemap index split by type (`/sitemap.xml` →
  `cards`, `players`, `checklists`, `guides`, `movers`, `pages`), indexable pages only,
  real `lastmod` (R49 to R51). `noindex` meta on non-qualifying pages.
- robots.txt per R52 and R105: disallow `/api/`, `/search`, `/ingest/`, `/r/`, `/u/`,
  `/embed/`; allow GPTBot, ClaudeBot, PerplexityBot and the other AI crawlers explicitly;
  sitemap declared.
- Structured data per page type: `SoftwareApplication` + `Offer` on the homepage only
  (R86), `Product` + `AggregateOffer` on card and sealed pages with the same "median asking
  price" wording as the visible text (R85), `Article` + `Person` on guides, `FAQPage`,
  `BreadcrumbList`. One validated example per type in the launch PR (R88).
- Unique text block per template, generated from real data (number of parallels, most
  valuable parallel, price by grade, last game line). No filler sentences.
- 404 page with guide links, 404 status (R59). `next/font` for Outfit (R66), `next/image`
  with `sizes` (R65), bundle analysis before launch (R67).

### Phase 4: mandatory pages and the first 10 guides

- Homepage rewritten around the winning commercial keyword, guides block, trust link (R47),
  contextual links from every guide back to it with the exact keyword as anchor (R42).
- `/how-we-price-cards`, `/about` (you, bio, photo, why), `/trust` (legal entity, registry
  link, address, contact: R80), `/pricing`, comparison pages (CollX, Ludex, Collectr, Market
  Movers: factual, nominative use of their names, no logos).
- Guides as MDX files in `apps/web/content/guides/` with frontmatter (`keyword`, `author`,
  `publishedAt`, `updatedAt`, `status: draft | review | published`). Only `published` is
  built in production; `lastmod` comes from `updatedAt` (R50). The first 10 are drafts marked
  "for Martin's review" in the PR; nothing is published without you.
- The R101 structure is enforced by a template, not by hand: direct answer slot, question
  H2s, tables, "Common questions" with `FAQPage`, homepage link, sources, related guides.

### Phase 5: free tools, widget, share images

- Tools: grading calculator (raw vs PSA 9 vs PSA 10 minus a grading fee you confirm the
  source of) and set completion cost, each on its own keyword page, client-side only.
- Widget: `<script async src="https://hoopticker.com/widget.js" data-card="…">` injects an
  iframe to `/embed/card/[slug]` (ISR, noindex, credited link to the card page). The script
  is under 2 KB and loads nothing until the iframe is in view.
- Open Graph images per player and per card with `opengraph-image.tsx` under those routes,
  generated by ISR and cached, like the Last night image today. Never per request.
- Public showcase `/u/[handle]`: opt-in, values hidden by default, never user photos (they
  stay private per CLAUDE.md), noindex.

### Phase 5b: competitor-inspired features (after checking what exists)

| Item                                               | Status in repo                                  | Work                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sealed products in the Vault                       | Not built                                       | `sealed_products` (kind enum, set, source URL, MSRP) from a hand-written CSV sourced from official Topps product pages; `sealed_items` (quantity, purchase price); prices with the same `record_price` pattern in separate tables; `plan_limits` key `sealed_items` = 10 free; excluded from Last night and movers |
| Auto-capture scan                                  | Manual shutter only                             | Mobile: capture when the ML Kit frame is stable and sharp for 600 ms, manual fallback. Web: only if the webcam OCR passes the accuracy bar                                                                                                                                                                         |
| Portfolio positioning                              | Not used                                        | From `BRAND_TAGLINE` everywhere                                                                                                                                                                                                                                                                                    |
| Gain/loss on every owned item                      | Premium-only in SQL views already; no locked UI | Locked blur + Premium badge for free users; the server keeps nulling the values for them                                                                                                                                                                                                                           |
| "What we don't do"                                 | Footer disclaimer only                          | Section on the homepage, About and store listing drafts                                                                                                                                                                                                                                                            |
| Guides hub, How we price, comparisons, trust pages | Not built                                       | Phase 4                                                                                                                                                                                                                                                                                                            |
| Creator program page                               | Not built                                       | Section 7, after your choice of reward                                                                                                                                                                                                                                                                             |
| Community links                                    | Not built                                       | Footer placeholders, identical footer everywhere (R46)                                                                                                                                                                                                                                                             |
| New pricing and Founder's Lifetime                 | $39.99 annual, no lifetime                      | Section 6                                                                                                                                                                                                                                                                                                          |

### Phase 6: launch PR

Pre-launch checklist from `docs/seo-rules.md` copied into the PR, PageSpeed mobile results
for the homepage, a card page and a guide (R61), Rich Results test screenshots per type
(R88), Netlify credit estimate with the real page counts, Search Console TXT record for you
to add (you create the domain property; Google gives you the token, I cannot generate it),
baseline report template (R114) and monthly report template (R115), PostHog funnel.

## 4. Programmatic page quality threshold (proposal)

Computed in SQL (`page_index_status` view), used by the sitemap, the `robots` meta and the
templates:

| Page           | Indexable when                                                                                   | `lastmod`                                            |
| -------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Card           | At least one parallel has a current price with `sample_size >= 5` (same threshold as Last night) | Latest `captured_at` among its current prices        |
| Player         | At least one indexable card                                                                      | Max of its cards' `lastmod` and its latest stat line |
| Set            | At least one card (the full checklist with print runs is unique data)                            | Latest import or price change in the set             |
| Sealed product | Current price with `sample_size >= 5`                                                            | Latest price change                                  |
| Guide          | `status = published`                                                                             | `updatedAt`                                          |
| Movers day     | Already gated by `public_last_night` thresholds                                                  | Morning update time                                  |

Waves: the showcase job already prices collections, last night's players, every rookie and
the top 60 players by game score. Wave 1 is therefore "every card that showcase has priced
at least once", wave 2 the rest as they qualify. The view reports counts per wave; I report
them in each phase summary instead of guessing now.

## 5. Email digest

Provider behind `supabase/functions/_shared/providers/email.ts` with `EMAIL_PROVIDER=mock|resend|brevo`.
Free-tier numbers checked on 2026-10-07:

| Provider | Free tier                             | Fit                                              |
| -------- | ------------------------------------- | ------------------------------------------------ |
| Resend   | 3,000 emails/month, 100/day, 1 domain | Simple API, good deliverability, tight daily cap |
| Brevo    | 300/day, no monthly cap stated        | 3x the daily room, marketing-platform overhead   |

Both caps cover login codes and digests together if one provider sends everything.
Recommendation: Resend, with a sending budget in `app_settings.email` (daily budget 80 for
digests, the rest reserved for login codes), and this rule: daily digest for Premium, weekly
(Monday) for free, Premium first when the budget runs out, skipped sends logged. The risk is
launch day: a spike of sign-ups beyond ~100 a day blocks login codes on Resend's free plan.
Mitigation: switch to the paid plan ($20/month) the week of launch if the waitlist is above
80 people, or pick Brevo for the 300/day room. Open question 5.

Every marketing email carries one-click unsubscribe (RFC 8058 headers plus a link) and the
postal address US law requires; the digest respects `digest_frequency` in Profile.

## 6. Pricing single source of truth

`PRICING` in `packages/shared`: monthly $5.99, annual $49.99 with a 7-day trial, Founder's
Lifetime $149 one-time, product ids per platform, savings computed from the numbers (30%
vs monthly, never typed by hand, R69/R75). A test asserts the values and the ids. Read by the
paywall, the web checkout, `/pricing`, structured data and the store listing drafts.

Founder's Lifetime: `app_settings.founders_lifetime = {enabled, ends_at, cap: 500}`; sold
count comes from the webhook (non-consumable purchase events, written to a
`lifetime_purchases` table); public RPC `founders_lifetime_status()` returns `enabled`,
`remaining`, `ends_at`; the plan disappears from every surface when either runs out. The
remaining count on the website refreshes through the `pricing` revalidation tag pinged by the
webhook. Lifetime buyers get the `premium` entitlement with no expiry on all platforms.

## 7. Referral and creator programs

Referral:

- `referrals` (referrer_id, referee_id unique, code, status pending | activated | rewarded |
  rejected, flags jsonb, created_at, activated_at, rewarded_at) with RLS: users read their
  own rows only. Codes in `profiles.referral_code`.
- Activation: a trigger on `collection_items` and `sealed_items` counts the referee's items;
  at 5 the referral becomes `activated`. `job-referrals` (service role) grants one month to
  each side through RevenueCat's promotional entitlement API and marks `rewarded`.
- Rules enforced in SQL: no self-referral (same user or same email), one referral per
  referee, 12 months per referrer per rolling year. Suspicious patterns (3+ referees with
  zero items after 14 days, same client fingerprint hash) set `flags` for your review, never
  an automatic block.
- Paying referrers: RevenueCat promotional entitlements run alongside a store subscription and
  do not extend it (verified in RevenueCat docs and community answers). Recommendation: bank
  the months (`referral_credits.months_banked`) and grant them when the paid subscription
  expires (webhook `EXPIRATION`). Open question 6.
- UI: Profile > Invite friends (link, share sheet on mobile, copy on web, referral list with
  status), one mention after the first Last night report, one line on the paywall.
- Website: `/referral-terms` (indexable, brand-only title), `/r/[code]` noindex, cookie on
  `.hoopticker.com`.

Creator program (section 3.8 item 10), simplest tracking that works:

- A creator is a user with a `creators` row (handle, platform, code). Attribution reuses the
  referral code mechanism. Conversions come from the existing webhook: `INITIAL_PURCHASE` and
  `RENEWAL` events of attributed users land in `creator_conversions`.
- Reward models, in increasing complexity: (a) free Premium only (promotional entitlements,
  no payouts, no tax forms), (b) flat bounty per paid conversion paid manually each month from
  a CSV, (c) recurring percentage, which needs a payout platform. Recommendation: (a) at
  launch, (b) when a creator passes a threshold you set.
- Disclosures: the creator page and creator terms require the FTC "material connection"
  disclosure in every video or post, and forbid paying for a specific opinion. Not legal
  advice; you validate before the page goes live. Open question 7.

## 8. Measurement

PostHog (free tier 1M events/month) loaded after idle on the website and in the web app,
proxied through `/ingest/` (blocked in robots.txt, R52). Funnel events: `landing_view`,
`signup_started`, `signup_completed`, `waitlist_joined`, `first_card_added`,
`premium_purchased`, plus `referral_applied`. I need the project key when you create it.

## 9. Free-tier risks

- Netlify credits: the website alone is estimated at ~220/300 in the README. New pages
  (sitemap index, OG images per card and player, guides) add bandwidth and ISR compute; the
  web app on Netlify adds bandwidth. Numbers come with the real bundle sizes in phase 6.
  Hosting the SPA on Cloudflare Pages removes most of the added risk (open question 4).
- Supabase Free: new tables are small; the sealed price history follows the same compaction.
  Email sending is outside Supabase.
- Email: section 5.
- eBay Browse quota (5,000/day): sealed products add a few hundred calls a night inside the
  existing 3,500 budget; priority order unchanged.

## 10. Legal items I will not decide

- External purchase links from the iOS and Android apps (you said you validate separately).
- FTC endorsement disclosures for creators and the referral program wording.
- Nominative use of competitor names on comparison pages (plain text, factual, no logos).
- Postal address and legal entity details for the trust page and marketing emails.
- The "save 30%" claim and any discount wording (R75).
- Grading fee amounts used by the calculator must come from the graders' public price pages,
  dated on the page (R71, R81).

## 11. Open questions (answered 2026-10-07, see Decisions above)

1. **Visual direction**: keep the light lime direction from `docs/img.png` and add foil
   frames by rarity, or switch to dark neon? Recommendation: keep light lime (applied
   yesterday, tokens ready); foil frames are additive.
2. **Keyword volumes**: authenticate Ahrefs in this session, or send an export? Until then
   volumes are `TBD`.
3. **Slugs**: approve the slug table above, in particular `/players/<name>-rookie-cards` vs
   `/players/<name>-cards`, `/checklists/...` and `/basketball-card-movers`. Final wording of
   the movers page waits for volumes.
4. **Web app hosting**: Cloudflare Pages (recommended, free, unlimited bandwidth, new vendor)
   or a second Netlify site sharing the 300 credits?
5. **Email provider**: Resend with the budget rule (recommended) or Brevo for the 300/day room?
6. **Paying referrers**: bank the months and apply them after the paid period (recommended)?
7. **Creator reward**: free Premium at launch (recommended), bounty later?
8. **Rename scope**: keep `@courtvault/*` packages, database names and the repo; change the
   bundle id and the URL scheme now (recommended)?
9. **Lifetime plan on iOS and Android too**, or web only? Entitlement is shared either way.
10. **About and trust content**: your bio, photo, legal entity name, registry link, address,
    contact email. Needed for phase 4.
11. **AI-assisted guide drafts** marked for your review in the PR: confirmed?

## 12. Roadmap (not built now, shown on the future /roadmap page)

- **Web scanner: evaluate after the mobile launch.** The webcam / photo scanner exists behind
  `app_settings.web_scanner` (disabled, no accuracy testing done). On the web, cards are added
  through manual search and CSV import. Decision of 2026-10-07.
- **Binder page scan**: recognizing the 9 cards of a binder page at once from their fronts
  (image recognition, likely a paid service, Premium only).
