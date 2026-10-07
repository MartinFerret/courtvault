# Website architecture and slugs

Phase 1 deliverable, 2026-10-07. **Slugs frozen the same day** without Keyword Planner data (Martin's
decision): the SERP data of the keyword map, Google autocomplete and the standard hobby search
formats decided them. Pages derive from `docs/keyword-map.csv` (R7): no page without a row.

## Two hosts

| Host                  | What                               | Indexed                                        |
| --------------------- | ---------------------------------- | ---------------------------------------------- |
| `hoopticker.com`       | Public website, Next.js, Netlify   | Yes                                            |
| `vault.hoopticker.com` | Web app, Angular, Cloudflare Pages | No: `noindex` meta, `robots.txt` `Disallow: /` |

One canonical host, HTTPS only (`.app` is HSTS-preloaded), no `www`, no trailing slash
(R56 to R58). The website links to the web app with plain action buttons (R43); the web app
links back to the card, player and checklist pages it shows.

## Menu by journey (R12, R19)

| Menu        | Entries                                           | Category page (R20)                                                              |
| ----------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Card values | Players, Checklists, Rookie rankings, Card movers | `/players`, `/checklists`, `/most-valuable-basketball-rookie-cards`, movers page |
| Guides      | Learn, Grade and sell, Protect and insure         | `/guides` plus one hub per step                                                  |
| App         | Pricing, Open the web app                         | `/pricing`, `vault.hoopticker.com`                                                |

Header: brand, the three menus, one action button "Open HoopTicker". Footer identical on
every page (R46): Card values, Guides (hubs), Company (About, Trust, How we price cards,
Roadmap, Press, Creators), Legal (Terms, Privacy, Account deletion, Referral terms),
Community (Discord, X, Instagram, TikTok, YouTube placeholders), the affiliation disclaimer
and the asking-price sentence.

Depth: every ranking page is reachable in 2 clicks from the homepage (R18). Players and
checklists are listed on their category pages; cards are listed on their checklist page and
their player page; guides on their hub.

## Page inventory

| Type            | Count                                                              | Indexed when                                                                         | Sitemap file |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------ |
| Homepage        | 1                                                                  | always                                                                               | pages        |
| Checklist (set) | 2 now, +1 per release                                              | always (full checklist with print runs)                                              | checklists   |
| Player          | ~350                                                               | at least one indexable card                                                          | players      |
| Card            | 599                                                                | one parallel priced with 5+ listings                                                 | cards        |
| Sealed product  | ~10 (official product types per set)                               | priced with 5+ listings                                                              | sealed       |
| Rookie ranking  | 1                                                                  | always                                                                               | pages        |
| Daily movers    | 1 + 1 per archived night                                           | gated by `public_last_night` thresholds                                              | movers       |
| Guide           | 10 in wave 1, ~15 total                                            | `status = published`                                                                 | guides       |
| Guide hubs      | 3 + `/guides`                                                      | always                                                                               | pages        |
| Comparison      | 4                                                                  | always                                                                               | pages        |
| Tool            | 1                                                                  | always                                                                               | pages        |
| Institutional   | 8                                                                  | always, but **not in the sitemap** (R49) except `/how-we-price-cards` and `/pricing` | pages        |
| Legal           | 3                                                                  | indexable, not in the sitemap (R49)                                                  | -            |
| Not indexed     | search, waitlist, `/r/[code]`, `/u/[handle]`, `/embed/card/[slug]` | `noindex`, not in the sitemap (R55)                                                  | -            |

Wave counts (how many cards and players qualify) come from the `page_index_status` SQL view
in phase 3 and are reported in that phase's summary.

## Slugs: frozen 2026-10-07 (R22 to R25)

The domain carries no keyword word, so the path must carry all of them (R22). No editorial
or product-internal names (R23). Stored in `public_slug` columns (`refresh_public_slugs()` after
every import); `apps/web/src/lib/paths.ts` builds the paths; the app mirrors them for deep links.

| Page                               | Current                                                      | Proposed                                                                                                                                                         | Keyword words in the path                                                                                             |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Homepage                           | `/`                                                          | `/`                                                                                                                                                              | domain + title + H1 (R24)                                                                                             |
| Checklists hub                     | `/sets`                                                      | `/checklists`                                                                                                                                                    | checklists                                                                                                            |
| Checklist                          | `/sets/2025-26-topps-chrome`                                 | `/checklists/2025-26-topps-chrome-basketball`                                                                                                                    | 2025-26, topps, chrome, basketball, checklist                                                                         |
| Players hub                        | `/players`                                                   | `/players`                                                                                                                                                       | players                                                                                                               |
| Player with a rookie card in scope | `/players/cooper-flagg`                                      | `/players/cooper-flagg-rookie-cards`                                                                                                                             | name, rookie, card                                                                                                    |
| Other player                       | `/players/lebron-james`                                      | `/players/lebron-james-cards`                                                                                                                                    | name, card                                                                                                            |
| Rookie card                        | `/cards/2025-26-topps-chrome-251-cooper-flagg`               | `/cards/2025-26-topps-chrome-cooper-flagg-rookie-card-251`                                                                                                       | season, set, name, rookie, card; number for uniqueness                                                                |
| Other card                         | `/cards/2025-26-topps-chrome-127-lebron-james`               | `/cards/2025-26-topps-chrome-lebron-james-card-127`                                                                                                              | season, set, name, card                                                                                               |
| Rookie ranking                     | `/rankings/rookies`                                          | `/most-valuable-basketball-rookie-cards`                                                                                                                         | most valuable, basketball, rookie, cards; season in the title only (R31, R73)                                         |
| Daily movers                       | `/last-night`, `/last-night/[date]`                          | `/trending-basketball-cards`, `/trending-basketball-cards/[date]` **or** `/basketball-card-movers`                                                               | decided by volume between "trending basketball cards", "hottest basketball cards right now", "basketball card movers" |
| Sealed hub                         | none                                                         | `/sealed`                                                                                                                                                        | sealed                                                                                                                |
| Sealed product                     | none (the brief mentions `/products/`, which does not exist) | `/sealed/2025-26-topps-chrome-basketball-hobby-box`                                                                                                              | season, set, basketball, hobby box                                                                                    |
| Guides hub                         | none                                                         | `/guides`                                                                                                                                                        | guides                                                                                                                |
| Guide hubs                         | none                                                         | `/guides/basketball-card-basics`, `/guides/grading-and-selling-basketball-cards`, `/guides/protecting-basketball-cards`                                          | step words; final names with the map                                                                                  |
| Guide                              | none                                                         | `/guides/<main-keyword-slug>`                                                                                                                                    | the whole keyword                                                                                                     |
| Comparison                         | none                                                         | `/compare/collx-alternative`, `/compare/ludex-vs-collx`, `/compare/collectr-vs-collx`, `/compare/market-movers-review`, `/compare/best-app-to-scan-sports-cards` | the whole keyword                                                                                                     |
| Tool                               | none                                                         | `/tools/is-it-worth-grading-my-card`                                                                                                                             | the whole keyword                                                                                                     |
| Institutional                      | none                                                         | `/about`, `/trust`, `/how-we-price-cards`, `/pricing`, `/roadmap`, `/press`, `/creators`, `/referral-terms`                                                      | brand-only titles (R32)                                                                                               |
| Legal                              | `/legal/terms`, `/legal/privacy`, `/legal/account-deletion`  | unchanged                                                                                                                                                        | -                                                                                                                     |
| Search                             | `/search`                                                    | unchanged, `noindex`                                                                                                                                             | -                                                                                                                     |
| Waitlist                           | `/waitlist`                                                  | unchanged, `noindex` once the web app sign-up exists                                                                                                             | -                                                                                                                     |
| Referral landing                   | none                                                         | `/r/[code]`, `noindex`                                                                                                                                           | -                                                                                                                     |
| Public showcase                    | none                                                         | `/u/[handle]`, `noindex`                                                                                                                                         | -                                                                                                                     |
| Widget                             | none                                                         | `/embed/card/[slug]`, `noindex`                                                                                                                                  | -                                                                                                                     |

Rules applied:

- The player slug suffix (`-rookie-cards` vs `-cards`) is fixed when the player is imported
  (any card in scope with `is_rookie`) and stored in the database, so it never changes.
- Card slugs keep the number so two cards of the same player in one set stay unique.
- The mobile app mirrors the website paths for deep links (`/cards/:slug`, `/players/:slug`,
  `/sets/:slug`): the app routes change with the website in phase 3, in the same commit.
- Redirects: none needed before launch (no page has a position: R25 case "rename
  immediately"). The old paths are simply removed.

## Title and H1 patterns (R27 to R37)

| Page | Title (`[Keyword]: [promise] | HoopTicker`) | H1 |
| --- | --- | --- |
| Homepage | `<commercial keyword>: <promise>` | the keyword alone (R37); the portfolio line as subtitle |
| Checklist | `2025-26 Topps Chrome Basketball Checklist: 299 cards, parallels, values` | `2025-26 Topps Chrome Basketball checklist` |
| Rookie player | `Cooper Flagg Rookie Cards: value by set, parallel and grade` | `Cooper Flagg rookie cards` |
| Veteran player | `LeBron James Cards: 2025-26 Topps values by parallel and grade` | `LeBron James cards (2025-26 Topps)` |
| Rookie card | `2025-26 Topps Chrome Cooper Flagg Rookie Card #251: value by grade` | `2025-26 Topps Chrome Cooper Flagg rookie card #251` |
| Ranking | `Most Valuable Basketball Rookie Cards (2025-26): ranked by asking price` | `Most valuable 2025-26 basketball rookie cards` |
| Guide | `<keyword>: <promise> (2026)` when updated yearly (R31) | the keyword |
| Institutional | `About | HoopTicker`, `Pricing | HoopTicker` | brand wording |

Titles are capped at 60 characters by the `seo()` helper; descriptions at 155 (R33). Both
come from the same data as the page (R69).

## Structured data per type (section 10)

| Page                               | JSON-LD                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Homepage                           | `Organization`, `WebSite` + `SearchAction`, `SoftwareApplication` + `Offer` (only here, R86)      |
| Pricing                            | `WebPage`, `FAQPage`                                                                              |
| Card, sealed                       | `Product` + `AggregateOffer` (asking prices, same wording as visible text, R85), `BreadcrumbList` |
| Player, checklist, ranking, movers | `BreadcrumbList`, `ItemList`, `FAQPage` where a questions section exists                          |
| Guide, comparison                  | `Article` + author `Person`, `FAQPage`, `BreadcrumbList`                                          |
| About                              | `Organization`, `Person`                                                                          |

## Internal links (R40 to R47)

- Every guide links the homepage once in the text with the commercial keyword as anchor
  (R42) and keeps its action button text (R43).
- Every card page links its player, its checklist, the ranking (rookies), the movers page
  (if it moved) and `/how-we-price-cards` next to the price label.
- Every guide links its hub and 2 to 3 sibling guides; hubs list their guides (R44).
- New page = 3 inbound text links the day it ships (R40), listed in the PR.
