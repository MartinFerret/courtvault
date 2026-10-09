# Plan: connect the website and the web app (2026-10-09)

Request from Martin on 2026-10-09: domain sweep to app.hoopticker.com, contextual CTAs, shared
session, PostHog funnel with UTMs, shareable images, league and referral landings, `/start`,
morning email links. Rule: screenshots before any deploy, push when done.

## 0. Decisions taken while planning (say if you want otherwise)

- **Shared session = a signed-in flag, not the auth tokens.** Sharing the Supabase auth cookie
  on `.hoopticker.com` would hand the session tokens to every script of the marketing site
  (PostHog included). The goal is only to know that a visitor is signed in, so the web app
  sets `ht_session=1` on `.hoopticker.com` (no token, `Secure`, `SameSite=Lax`, 30 days,
  removed at sign-out) and the website swaps "Sign up" for "Open my Vault" on the client.
  ISR pages stay cached and identical for everyone.
- **Primary CTA on the website becomes the web app** (sign up free). The waitlist stays for
  the iPhone and Android apps.
- **Referral = attribution only.** `/r/[code]` presents HoopTicker and remembers the code
  through sign-up (`profiles.referred_by`). The rewards of plan-web-seo section 7 need
  RevenueCat or Stripe promotions and the answer to its open question 6: not built.
- **Share images use our foil frames, never Topps images** (the Topps permission covers the
  catalog pages of the website, not user-generated images).
- **CORS**: edge functions keep `Access-Control-Allow-Origin: *`. Every user function checks
  the session JWT and every job checks its secret, so an origin allow-list adds no protection
  and would break the native app (`https://localhost`, `capacitor://localhost`).

## 1. Domain sweep

`vault.` -> `app.` is done (commit 814c9c2). Left: Supabase Auth `site_url` becomes
`https://app.hoopticker.com` (sign-in happens there), and the web app's `robots.txt` comment
ships with the next app deploy.

## 2. Contextual CTAs and actions preserved through sign-up

- Website links built by `appLink(path, action, campaign)` with UTMs:
  card page "Add to my Vault" -> `/cards/<slug>?action=add`, player page "Put him in my
  lineup" -> `/players/<slug>?action=lineup`, checklist page "Follow this set" ->
  `/sets/<slug>?action=follow`.
- App: `authGuard` stores the requested URL (`ht_intent`, 1 hour) before sending to sign-in;
  after sign-in the app goes there first. Pages run the action once: card page opens the add
  panel, set page follows (limits and paywall as usual), player page sends owners to the
  court with the player placed, and non-owners to his cards with "add one to field him".

## 3. Signed-in flag

As decided above. Website: header and CTA blocks read the flag in the browser.

## 4. PostHog funnel and UTMs

- Same project on both, cross-subdomain cookie (one `distinct_id` from website to app). The
  app sends to `https://hoopticker.com/ingest` (first-party proxy already in place).
- Events: website `$pageview` and `cta_clicked`; app `signup_completed`, `first_card_added`,
  `first_lineup_saved`; server `premium_started` from the Stripe and RevenueCat webhooks
  (reliable, not blocked). App identifies with the Supabase user id, never the email.
- UTMs and the referral code: first touch stored in `ht_attr` on `.hoopticker.com` by the
  website (and by the app when traffic lands there), copied once into
  `profiles.acquisition` at sign-up and set as PostHog person properties.
- The funnel is created in PostHog: [Website to Premium funnel](https://eu.posthog.com/project/297725/insights/pcp9k76o)
  (steps: website `$pageview` on hoopticker.com, `signup_completed`, `first_card_added`,
  `first_lineup_saved`, `premium_started`; 30-day window). The edge functions need the
  `POSTHOG_KEY` secret (same public key as the website) for `premium_started`.

## 5. Shares, league invites, referral landing

- `shares` table (code, kind lineup | league | vault, frozen payload with the username only).
  `create_share(kind)` builds it from the user's own data; `public_share(code)` reads it.
- Website `/share/[code]` (noindex, public): the summary, a generated Open Graph image
  (`/share/[code]/opengraph-image`, downloadable), links to public pages (scoring rules,
  card pages) and the CTA. App: Share buttons on the recap, a league page and the Vault.
- `/join/[code]` (noindex): league invite landing (league name, member count, what HoopTicker
  is), then the app's join route. The league page shares this link.
- `/r/[code]` (noindex): referral landing, remembers the code. Profile: "Invite friends".

## 6. `/start`

One promise, one CTA to the web app sign-up with the incoming UTMs, noindex, not in the
sitemap, no navigation besides the brand.

## 7. Morning email

Links with UTMs: "See your score" (app recap), "Open my Vault" (app Vault), "Last night's
movers" (website trending page of that night).

## 8. Tests and delivery

pgTAP (shares, acquisition, referral codes, invite info), Deno (analytics capture, digest
links), web unit tests (links, attribution), screenshots of the new website pages, the CTAs
in both states and the share image. No deploy before Martin's review.
