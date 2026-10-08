# Price source: CardSight AI

Decided on 2026-10-08. eBay Browse is out as a source (its code stays as the disabled fallback,
`PRICE_PROVIDER=ebay`). Prices come from [CardSight AI](https://cardsight.ai): eBay sales and
listings they collect, read through their REST API with `CARDSIGHT_API_KEY`. Free tier: 750
calls a month, 4 requests a second, no credit card. Terms: https://cardsight.ai/terms (dated
August 26, 2026, governed by Maine law).

## What we verified before building (2026-10-08, 31 calls)

- `GET /v1/subscription/` is free and returns the calls counted this month; the counter lags by
  about a minute. Catalog list calls count. One `POST /v1/pricing/` with 100 card ids counts as
  **one** call.
- `limit: 100` per card makes the upstream time out ("Request timeout after 10000ms"); the
  default `limit: 25` answers in 1.4 s for 100 cards. The bulk body accepts `parallel_id`
  (`null` = base card only) and `grade_id` (`null` = ungraded), so one call prices one parallel
  and one grade for up to 100 cards.
- Data profile on 100 Topps Chrome base cards, 3 months, all parallels: 2,123 listings, 2,051
  asking (`fixed`), 72 completed auction sales (`auction`); 4 card×parallel pairs had 3 or more
  auction sales. Source eBay only. Records carry title, price, date, source, listing type, a
  redirect url and an eBay image url: we store none of them.
- Our nine 2025-26 sets exist as releases, each with a "Base Set" whose card numbers match ours
  (Topps Chrome 299/299 numbers and names; Bowman 200/200 numbers, 5 names differ by accents).

## The three price states

| State | `price_kind` | Rule | Label |
| --- | --- | --- | --- |
| Auction median | `auction_median` | at least 3 completed auction sales in the period (`3m`), median after dropping outliers beyond 1.5 × IQR | Recent auction sales |
| Last auction sale | `last_auction` | 1 or 2 auction sales: the latest one, with its date in `sale_at` | Last auction sale, Oct 2 |
| Asking median | `ask_median` | no auction sale: median of the current Buy It Now asks | Current asking price |

`observe()` in `supabase/functions/_shared/providers/cardsight.ts` is the single place this rule
lives. `record_price()` stores the state and the sale date with the figure; a history point is
written when the price or the state changes. Labels come from `priceKindLabel()` in
`packages/shared` and are shown next to every figure on the website and in the app; the generic
label for sums and mixed columns is `PRICE_LABEL` ("Market value").

## Data policy (cautious option, until CardSight answers in writing)

Martin asked CardSight by email whether price history may be stored. Until the answer:

- never store raw listings: `price_listings` exists but is written only when
  `app_settings.price_source.store_raw_listings` is `true`;
- store only our own daily aggregates per card, parallel and grade (`price_points`,
  `current_prices`), as before;
- raw API responses are cached for 12 hours in `cardsight_cache` (their ToS §3(c), short-term
  cache for performance) and purged at the start of every run;
- their parallel lists are **not** copied into our catalog (§3(b)(14)); only the ids of the
  parallels we already have are kept in `cardsight_parallels`;
- our Terms (website `/legal/terms`, app legal screen) carry the no-scraping, no-reuse clauses
  their §3(d) requires from our users.

If CardSight allows history: set `store_raw_listings` to `true`; the run starts filling
`price_listings` with the records behind each figure. Nothing else changes.

## Mapping our catalog to theirs

`job-catalog-map` (`pnpm job:map -- --force`, about 45 calls for nine sets) fills:

- `cardsight_sets`: our set → their release and base set (aliases in the job: "Topps Basketball"
  is their "Topps", "Topps Hoops" their "NBA Hoops", "Topps Chrome Updates" their "Topps Chrome
  Update", "Topps Finest" their "Finest");
- `cardsight_cards`: our card → their card, matched by number inside the base set;
- `cardsight_parallels`: our parallel names → their parallel ids, matched by normalized name,
  with or without "Refractor";
- `app_settings.cardsight_grades`: PSA 9 and PSA 10 ids.

Run it again after every checklist import. Its response reports, per set, the cards and
parallels matched and the ones missing.

## The nightly run and the quota guard

`job-prices` (5:30 AM Eastern) with `PRICE_PROVIDER=cardsight` runs
`supabase/functions/job-prices/cardsight-run.ts`:

1. Reads the calls counted this month. Mode: **normal** under 80% of the quota, **essential**
   (collections, alerts, last night's players) from 80%, **critical** (last night's players
   only) from 95%, with one email to `EMAIL_ADMIN` per month. Thresholds and quota live in
   `app_settings.price_source`.
2. Work list from `cardsight_targets(mode)`: the showcase priorities, plus `full_pass_pairs()`
   on the full-pass weekday (Sunday) in normal mode. Last night's players always come first,
   then collections, alerts, rookies, top players, the full pass.
3. `planRun()` (`_shared/pricing-plan.ts`) applies the daily card cap (300 distinct cards on a
   daily pass) and fits the bulk calls under what is left of the quota minus a reserve of 10.
4. One bulk call per parallel, grade and 100 cards; every figure written through
   `record_price()` with its state; `price_coverage` logs requested / priced / skipped per reason;
   `price_source_state` keeps the last full pass day and the guard email month.

Budget for 2,198 cards, Base plus two preferred parallels per set: 66 calls per full pass, plus
about 5 for the rookies' PSA 10. Weekly full pass (about 285 a month) plus a daily pass capped
at 300 cards (about 270 a month): about 560 calls a month, a 25% margin under 750.

`pnpm job:prices -- --force` runs it by hand; the response carries `usage_before`, `calls`,
`usage_after_estimate`, `kinds` (how many figures of each state) and `coverage`.

## Identification API (not built)

CardSight also identifies cards from photos (99.5% stated accuracy, multi-card images, slabs).
Parallel recognition is in beta for baseball only; for basketball, coverage "varies by set".
One image is one call whatever the number of cards in it. Decision of 2026-10-08: the OCR scan
stays; a binder scan is a Premium idea for later.
