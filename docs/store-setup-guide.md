# Store setup guide: Apple, Google, RevenueCat, Firebase

Step-by-step for Martin, written 2026-10-08. Do the sections in this order: some steps need an
earlier one (RevenueCat needs the store products, Play products need a first build from Claude).
`docs/store-checklist.md` stays the short status list.

**Where secrets go.** Never paste a key in the chat. Keep downloaded files (`.p8`, `.json`,
`.plist`) in a folder outside the repository, for example `~/Documents/hoopticker-keys/`.
Values go in these gitignored files:

| Value                                                                                            | File or place                           |
| ------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `REVENUECAT_APPLE_KEY`, `REVENUECAT_GOOGLE_KEY`, `GOOGLE_WEB_CLIENT_ID`, `APPLE_SIGN_IN_ENABLED` | `apps/mobile/.env`                      |
| `REVENUECAT_WEBHOOK_SECRET`, `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`             | `supabase/functions/.env`               |
| Apple and Google sign-in credentials                                                             | Supabase dashboard (step A5, G6)        |
| `APPLE_TEAM_ID`, `ANDROID_SHA256_FINGERPRINTS`                                                   | Netlify environment (site `hoopticker`) |

Fixed identifiers, type them exactly:

| What                     | Value                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Bundle id / package name | `app.hoopticker.mobile`                                                                                                       |
| Products                 | `premium_monthly` ($5.99, 1 month), `premium_yearly` ($49.99, 1 year, 7-day free trial), `founders_lifetime` ($149, one-time) |
| Entitlement (RevenueCat) | `premium`                                                                                                                     |
| Supabase auth callback   | `https://lufpytmtwocqgooxedfx.supabase.co/auth/v1/callback`                                                                   |
| RevenueCat webhook       | `https://lufpytmtwocqgooxedfx.supabase.co/functions/v1/revenuecat-webhook`                                                    |
| Privacy policy           | `https://hoopticker.com/legal/privacy`                                                                                        |
| Terms                    | `https://hoopticker.com/legal/terms`                                                                                          |
| Account deletion         | `https://hoopticker.com/legal/account-deletion`                                                                               |
| Support email            | `mferret.pro@gmail.com`                                                                                                       |

## 0. Before anything: individual or organization account

- Google Play: a **personal** account created today must run a closed test with at least 12
  testers for 14 days before it can publish. An **organization** account is exempt, but needs
  a D-U-N-S number.
- Apple: an individual account works for a sole trader (seller name "Martin Ferret"). An
  organization account also needs the D-U-N-S number.
- Recommendation: request a free D-U-N-S number now for your micro-entreprise (SIREN
  999 111 438) with Apple's lookup tool, then enroll both stores as an organization.
  https://developer.apple.com/enroll/duns-lookup/ (allow up to about 5 business days).
  If you prefer not to wait, enroll as individual / personal and plan the 14-day Play test.

## A. Apple

A1. **Developer Program** ($99/year): https://developer.apple.com/programs/enroll/
Sign in with your Apple ID (two-factor on), choose Individual or Organization, pay. Approval
takes from a few hours to a few days.

A2. **Team ID**: https://developer.apple.com/account then Membership details. Copy the
10-character Team ID into the Netlify environment as `APPLE_TEAM_ID` (Site configuration >
Environment variables), then tell Claude to redeploy.

A3. **App ID**: https://developer.apple.com/account/resources/identifiers/list
"+" > App IDs > App > Description `HoopTicker`, Bundle ID **Explicit** `app.hoopticker.mobile`.
Capabilities: tick **Associated Domains**, **Push Notifications**, **Sign In with Apple**. Save.

A4. **Services ID** (Sign in with Apple through Supabase): same page, "+" > Services IDs >
Description `HoopTicker Sign in`, Identifier `app.hoopticker.signin`. Save, open it, tick
Sign In with Apple > Configure: Primary App ID `app.hoopticker.mobile`, Domains
`lufpytmtwocqgooxedfx.supabase.co`, Return URL
`https://lufpytmtwocqgooxedfx.supabase.co/auth/v1/callback`. Save.

A5. **Key** (one key for Sign in with Apple and push):
https://developer.apple.com/account/resources/authkeys/list "+" > name `HoopTicker`, tick
**Sign in with Apple** (Configure: primary App ID `app.hoopticker.mobile`) and
**Apple Push Notifications service (APNs)**. Continue, Register, **Download the .p8 once**
(it cannot be downloaded again) and note the Key ID.
Then Supabase: https://supabase.com/dashboard/project/lufpytmtwocqgooxedfx/auth/providers >
Apple > enable. Client IDs: `app.hoopticker.signin,app.hoopticker.mobile`. Secret Key: Supabase
shows a link to generate it from the .p8, Team ID, Key ID and Services ID. That secret expires
after 6 months: put a reminder to regenerate it. Save, then set `APPLE_SIGN_IN_ENABLED=true` in
`apps/mobile/.env`.

A6. **Agreements, tax, banking** (required before any paid product):
https://appstoreconnect.apple.com/business > Paid Apps agreement: accept, add the bank account
(IBAN), tax form (W-8BEN for a French resident, treaty article for France), contact info.

A7. **App record**: https://appstoreconnect.apple.com/apps > "+" > New App. Platform iOS,
Name `HoopTicker` (if taken: `HoopTicker: Card Values`), Primary language English (U.S.),
Bundle ID `app.hoopticker.mobile`, SKU `hoopticker-ios`, Full access.

A8. **Subscriptions**: in the app > Monetization > Subscriptions > Create subscription group
`Premium`. Add `premium_monthly` (reference name "Premium Monthly", duration 1 month, price
$5.99 USD, let Apple derive other countries) and `premium_yearly` (1 year, $49.99). On
`premium_yearly` > Introductory Offers > "+" > all countries, Free, 1 week. For each: a display
name and description in English (U.S.), and a review screenshot of the paywall (Claude provides it).

A9. **Lifetime**: Monetization > In-App Purchases > "+" > Non-Consumable, reference name
"Founder's Lifetime", product ID `founders_lifetime`, price $149.

A10. **In-App Purchase key for RevenueCat**: https://appstoreconnect.apple.com/access/integrations/api

> In-App Purchase tab > Generate key, name `RevenueCat`. Download the .p8, note the Key ID
> and the Issuer ID shown on the page.

A11. **Xcode** on this Mac: https://apps.apple.com/app/xcode/id497799835 (about 15 GB). Open it
once, accept the license, then Settings > Accounts > add your Apple ID. Tell Claude: the iOS
project is generated from there.

## G. Google

G1. **Play Console** ($25 once): https://play.google.com/console/signup
Account type Organization (with the D-U-N-S) or Personal. Identity verification follows
(ID document, sometimes a few days). Contact email `mferret.pro@gmail.com`.

G2. **Payments profile** (required to sell): Play Console > Settings > Payments profile, or
https://pay.google.com/business/console. Business name, address in Briare, bank account.

G3. **App**: Play Console > Create app. Name `HoopTicker`, default language English (United
States), App, Free (the app is free with in-app purchases), accept the declarations.

G4. **First build**: Play only lets you create products after an app bundle with the billing
permission is uploaded. Tell Claude when G3 is done: Claude builds a signed AAB and gives you
the steps to upload it to Testing > Internal testing. Package name then becomes
`app.hoopticker.mobile` for good.

G5. **Products** (after G4): Monetize with Play > Products > Subscriptions > Create:
`premium_monthly`, base plan id `monthly`, auto-renewing, 1 month, $5.99, activate.
`premium_yearly`, base plan id `yearly`, auto-renewing, 1 year, $49.99, then Add offer >
Free trial 7 days, eligibility new customers, activate. Then Products > In-app products >
`founders_lifetime`, $149, activate.

G6. **Google sign-in** (through Supabase):

- https://console.cloud.google.com/projectcreate > project `HoopTicker` (Firebase in section F
  can reuse it).
- https://console.cloud.google.com/auth/branding (OAuth consent screen): External, app name
  HoopTicker, support email `mferret.pro@gmail.com`, logo optional, authorized domain
  `hoopticker.com`, privacy and terms URLs from the table above. Publish the app (production)
  so any Google account can sign in.
- https://console.cloud.google.com/apis/credentials > Create credentials > OAuth client ID >
  Web application, name `Supabase`. Authorized JavaScript origins: `https://app.hoopticker.com`,
  `https://hoopticker.com`. Authorized redirect URI:
  `https://lufpytmtwocqgooxedfx.supabase.co/auth/v1/callback`. Copy the client ID and secret.
- Supabase > Auth > Providers > Google: enable, paste client ID and secret, save.
- `GOOGLE_WEB_CLIENT_ID=<client ID>` in `apps/mobile/.env`. Claude redeploys the web app.

G7. **Service account for RevenueCat**: follow RevenueCat's page step by step (it creates the
Google Cloud service account, enables the APIs and grants it in Play Console):
https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials
Download the JSON key. Permissions take up to 36 hours to apply on Google's side.

G8. **SHA-256 fingerprints** (after G4): Play Console > Test and release > Setup > App
integrity > App signing. Copy the SHA-256 of the **app signing key** and of the **upload
key**, put both, comma-separated, in Netlify as `ANDROID_SHA256_FINGERPRINTS`.

## R. RevenueCat (after A8 to A10 and G5, G7)

R1. Sign up: https://app.revenuecat.com/signup > create project `HoopTicker`.

R2. Apps: Project settings > Apps > "+" App Store: bundle id `app.hoopticker.mobile`, upload the
In-App Purchase key .p8 from A10 with its Key ID and Issuer ID. "+" Play Store: package
`app.hoopticker.mobile`, upload the service account JSON from G7.

R3. Products: Product catalog > Products > Import from each store (the three ids per store).

R4. Entitlement: Product catalog > Entitlements > New, identifier **`premium`**, attach the six
products (three per store).

R5. Offering: Product catalog > Offerings > New, identifier `default`, mark it Current. Packages:
Monthly (`$rc_monthly`) with both `premium_monthly`, Annual (`$rc_annual`) with both
`premium_yearly`, Lifetime (`$rc_lifetime`) with both `founders_lifetime`. The app matches
by product id, so package names only need to be consistent.

R6. Public SDK keys: Project settings > API keys. Copy the Apple key (`appl_...`) and the Google
key (`goog_...`) into `apps/mobile/.env` as `REVENUECAT_APPLE_KEY` and `REVENUECAT_GOOGLE_KEY`.
Never the secret key (`sk_...`).

R7. Webhook: Integrations > Webhooks > Add. URL from the table above. Authorization header
value: a long random string (run `openssl rand -hex 32` in a terminal), the same string as
`REVENUECAT_WEBHOOK_SECRET` in `supabase/functions/.env`. Environment: both production and
sandbox. Events: all. Then tell Claude to push that one secret to Supabase.

R8. App user id: nothing to do, the app sets the Supabase user id itself.

## F. Firebase (push notifications)

F1. https://console.firebase.google.com > Add project > choose the Google Cloud project
`HoopTicker` from G6 (or a new one). Google Analytics: off.

F2. Android: Project overview > Add app > Android, package `app.hoopticker.mobile`, nickname
HoopTicker. Download `google-services.json`. Skip the SDK steps (Claude does them).

F3. iOS: Add app > Apple, bundle id `app.hoopticker.mobile`. Download
`GoogleService-Info.plist`. Skip the SDK steps.

F4. APNs: Project settings > Cloud Messaging > Apple app configuration > APNs Authentication
Key > Upload the .p8 from A5 with its Key ID and your Team ID.

F5. Server key for our edge functions: Project settings > Service accounts > Generate new
private key > JSON. From it, in `supabase/functions/.env`: `FCM_PROJECT_ID` = `project_id`,
`FCM_CLIENT_EMAIL` = `client_email`, `FCM_PRIVATE_KEY` = `private_key` (keep the `\n` as
written, in double quotes), and `PUSH_PROVIDER=fcm` only when Claude says the native build is
ready (push to the cloud: Claude sends only those lines).

F6. Give Claude the paths of `google-services.json` and `GoogleService-Info.plist`; they go in
the generated native projects at build time and never in Git.

## Store listings (both, once the builds exist)

- App Store Connect > App Information: category Sports (secondary Finance or Lifestyle),
  privacy policy URL, App Privacy questionnaire: email address, purchases, user content
  (photos, kept private), identifiers (user id); used for app functionality, linked to the
  user, not used for tracking. Age rating questionnaire: no objectionable content.
- Play Console > Policy > App content: privacy policy URL, ads: no, data safety (same answers),
  account deletion URL from the table, content rating questionnaire, target audience 18+
  (collectors, purchases), news app: no.
- Screenshots, descriptions and the feature graphic: Claude prepares them from the running app.
