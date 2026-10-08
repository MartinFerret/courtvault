# Store launch checklist (App Store and Google Play)

Step-by-step instructions with links: `docs/store-setup-guide.md`.

What has to exist in each console before the first store build, and what the repository
expects from it. Written 2026-10-08. Nothing here is automated: every row is an account,
a key or a screen that only the owner can create. Keys go to the gitignored `.env` files
named below, never in the chat or the repository.

Already done in the code: paywalls and limits, RevenueCat SDK wiring (mock without keys),
Sign in with Apple and Google (hidden without keys), push registration (log provider),
legal screens, account deletion (`delete-account`), notification permission asked after the
first scan, deep link routing in the app (`DeepLinkService`), `allowMixedContent` off for
store builds.

## 1. Apple

| #   | What                                                                                                                                                                          | Where it goes                                                         | Notes                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A1  | Apple Developer Program membership ($99/year, D-U-N-S for a company)                                                                                                          | you                                                                   | needed for everything below                                             |
| A2  | App ID `app.hoopticker.mobile` with capabilities Push Notifications, Sign in with Apple, Associated Domains                                                                   | Certificates, Identifiers & Profiles                                  | bundle id pinned in `capacitor.config.ts`                               |
| A3  | Team ID (10 characters)                                                                                                                                                       | `APPLE_TEAM_ID` in the Netlify environment, then redeploy the website | serves `/.well-known/apple-app-site-association` (built, 404 until set) |
| A4  | Sign in with Apple: Services ID, key (.p8), key id                                                                                                                            | Supabase Auth > Providers > Apple                                     | then `APPLE_SIGN_IN_ENABLED=true` in `apps/mobile/.env`                 |
| A5  | APNs key (.p8)                                                                                                                                                                | Firebase project (cloud messaging, iOS)                               | push goes through FCM on both platforms                                 |
| A6  | App Store Connect app record, in-app purchases `premium_monthly` $5.99, `premium_yearly` $49.99 with a 7-day introductory free trial, `founders_lifetime` $149 non-consumable | App Store Connect                                                     | ids and amounts pinned by `PRICING` in `packages/shared`                |
| A7  | Privacy policy URL, support URL, age rating, App Privacy answers (purchases, user content, identifiers)                                                                       | App Store Connect                                                     | privacy page lives on hoopticker.com (needs the legal identity)         |
| A8  | Screenshots 6.7" and 6.5" (and 12.9" iPad if iPad is enabled), 1024 px icon                                                                                                   | App Store Connect                                                     | icon from `apps/web/src/app/icon.svg`                                   |
| A9  | Xcode on this Mac, `npx cap add ios`, signing with the team                                                                                                                   | local                                                                 | iOS project has never been generated                                    |

## 2. Google

| #   | What                                                                                                                                             | Where it goes                                                                                             | Notes                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| G1  | Play Console developer account ($25 one-time, identity verification)                                                                             | you                                                                                                       |                                                              |
| G2  | Release keystore (upload key)                                                                                                                    | local, backed up outside the repo                                                                         | `apps/mobile/android/` is generated and gitignored           |
| G3  | SHA-256 of the upload key and of the Play App Signing key                                                                                        | `ANDROID_SHA256_FINGERPRINTS` (comma-separated) in the Netlify environment, then redeploy the website     | serves `/.well-known/assetlinks.json` (built, 404 until set) |
| G4  | OAuth web client id (Google sign-in)                                                                                                             | Supabase Auth > Providers > Google, `GOOGLE_WEB_CLIENT_ID` in `apps/mobile/.env`                          |                                                              |
| G5  | Firebase project with `google-services.json`, FCM service account                                                                                | `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` in `supabase/functions/.env`, `PUSH_PROVIDER=fcm` | never tested in real conditions                              |
| G6  | Play app `app.hoopticker.mobile`, subscriptions `premium_monthly`, `premium_yearly` (7-day free trial offer), in-app product `founders_lifetime` | Play Console > Monetize                                                                                   | same ids as Apple                                            |
| G7  | Data safety form, privacy policy URL, content rating questionnaire                                                                               | Play Console                                                                                              |                                                              |
| G8  | Screenshots phone (and 7"/10" tablet if tablets are enabled), 512 px icon, 1024x500 feature graphic                                              | Play Console                                                                                              |                                                              |
| G9  | Launcher icon and splash from the mark                                                                                                           | `apps/mobile/resources/` (committed), `pnpm --filter @courtvault/mobile assets`                           | done 2026-10-08 for Android; rerun after `cap add ios`       |

## 3. RevenueCat

| #   | What                                                                                                    | Where it goes                                                                 |
| --- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R1  | Project with an iOS app and an Android app, App Store Connect API key and Play service account attached | RevenueCat dashboard                                                          |
| R2  | Products imported from both stores, entitlement `premium`, offering `default` with the three packages   | RevenueCat dashboard                                                          |
| R3  | Public SDK keys                                                                                         | `REVENUECAT_APPLE_KEY`, `REVENUECAT_GOOGLE_KEY` in `apps/mobile/.env`         |
| R4  | Webhook to `https://<project>.functions.supabase.co/revenuecat-webhook` with its authorization header   | `REVENUECAT_WEBHOOK_SECRET` in `supabase/functions/.env` and Supabase secrets |
| R5  | Sandbox purchase on each platform: premium granted, cancelled, expired, lifetime                        | `profiles.is_premium` / `premium_until` only ever written by the webhook      |

## 4. Legal and content (both stores)

- Legal identity: company or sole-trader name, postal address, support email. Used by the
  Terms, Privacy and About screens, the website footer, `EMAIL_POSTAL_ADDRESS`, and both
  consoles. Missing today.
- Public privacy policy and terms pages at `hoopticker.com/legal/privacy` and `/legal/terms`
  (exist, need the identity above and the CardSight / eBay data clauses re-read).
- "Not affiliated with the NBA, NBPA or Topps" stays in the About screen and store listing.
- No player photos, no team or league logos anywhere in screenshots or the listing.

## 5. Code steps once the items above exist (in order)

1. Domains `hoopticker.com` and `app.hoopticker.com` live (deep link files must be served
   from the final host).
2. Set `APPLE_TEAM_ID` and `ANDROID_SHA256_FINGERPRINTS` on Netlify and redeploy: the
   association files go live (paths in `APP_LINK_PATHS`, `packages/shared`). Native side, in the
   generated projects (gitignored, redo after a fresh `cap add`): Xcode capability Associated
   Domains `applinks:hoopticker.com`; AndroidManifest intent filter with
   `android:autoVerify="true"`, scheme https, host hoopticker.com, path prefixes `/cards/`,
   `/players/`, `/checklists/`, `/trending-basketball-cards`, `/most-valuable-basketball-rookie-cards`.
3. `npx cap add ios`, capabilities in Xcode, `pnpm --filter @courtvault/mobile assets` for the
   iOS icons and splash, `npx cap sync` without `CAP_ALLOW_MIXED_CONTENT`.
4. Real-condition checks: RevenueCat sandbox purchases, FCM push on a device, Sign in with
   Apple and Google, a Universal Link and an App Link from Safari / Chrome.
5. First cloud cycle of `job:map` then `job:prices` so the store screenshots show CardSight
   figures, not seed prices.
6. QA walkthrough of `docs/launch-checklist.md` section 5 (the two leftovers of 2026-10-08,
   sidebar during onboarding and tall import tile, are fixed).
7. TestFlight and Play internal testing before any public release.
