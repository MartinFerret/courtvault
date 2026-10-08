# Plan: Vault Score, Leagues and Quick add (proposal, 2026-10-08)

Status: **waiting for Martin's approval**. Nothing below is built. Open questions are in
section 9; the ones marked (blocking) must be answered before the matching phase starts.

## 0. What the codebase already gives us

- Box scores: `player_game_lines` (points, rebounds, assists, steals, blocks, minutes, `raw`).
  Highlightly's raw entry carries "Total Turnovers" (checked on a cloud line of 2026-10-07), so
  turnovers can be added and backfilled without new API calls.
- `job-stats` (5 AM Eastern) stores last night's finished games only; it skips scheduled games.
  We do not know today's first tip-off yet: one new request per day fixes that (section 2).
- Preseason boundary: `app_settings.season_start` = 2026-10-20 (already used by Last night).
- Ownership: `collection_items` -> `parallels` -> `cards` -> `players`.
- Limits: `plan_limits` + triggers raising `LIMIT_REACHED:<key>`, paywall wiring in the app.
- Card text matching: `scan-match/matcher.ts` already extracts player, number, season, set and
  serial run from noisy OCR text with fuzzy matching. Quick add reuses and extends it.
- Morning: `morning_report_for()`, `job-morning` digest, Last night screen and push.
- Design: tokens in `apps/mobile/src/theme/tokens.scss`, foil frames (`foilTier()`), Outfit.
- Scope note: CLAUDE.md lists "leaderboards and badges" as out of scope. This feature reverses
  that; CLAUDE.md is updated in phase 1 once approved.

## 1. Data model (new migration files, RLS on every table)

| Table / object                                                              | Purpose                                                                      | RLS                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| `player_game_lines.turnovers`                                               | new column, parsed from now on, backfilled from `raw`                        | as today (public read)                    |
| `fantasy_scoring` (stat, weight, valid_from)                                | configurable weights; defaults pts 1, reb 1.2, ast 1.5, stl 3, blk 3, tov -1 | public read, service write                |
| `fantasy_seasons` (id, label, regular_start, regular_end)                   | NBA regular season bounds; preseason never scores                            | public read                               |
| `game_days` (day, first_tip_at, games, locked_at, scored_at)                | today's schedule and the lock time                                           | public read, service write                |
| `lineup_drafts` (user_id pk, player_ids uuid[5], captain_id, updated_at)    | the lineup being edited, always for the next unlocked day                    | owner read/write through RPC only         |
| `lineups` (user_id, game_day, player_ids, captain_id, locked_at)            | frozen snapshot at the lock; history                                         | owner read; standings read through RPC    |
| `lineup_scores` (user_id, game_day, total, per_player jsonb)                | computed points                                                              | owner read; public aggregates through RPC |
| `profiles.username` (citext unique), `profiles.ranking_opt_out`             | public name, opt-out                                                         | owner write via RPC (filter)              |
| `blocked_words` (word)                                                      | profanity list, normalized (leetspeak, repeats)                              | service only                              |
| `leagues` (id, name, owner_id, invite_code, created_at)                     | private leagues                                                              | members read                              |
| `league_members` (league_id, user_id, joined_day)                           | membership                                                                   | members read; join/leave via RPC          |
| `standings_snapshots` (scope, scope_id, period, user_id, rank, points, day) | daily ranks for movement arrows and streaks                                  | through RPC                               |
| `badges` (user_id, kind, period, scope_id, awarded_at)                      | weekly winner, perfect captain, ...                                          | public read of own / league members       |
| `lineup_events` (user_id, at, action)                                       | rate limit and abuse signals                                                 | service only                              |
| `abuse_flags` (user_id, reason, details, created_at, reviewed_at)           | for Martin's review                                                          | service only                              |
| `plan_limits` row `private_leagues`                                         | free 1, premium unlimited                                                    | as today                                  |

Rules enforced in SQL:

- `set_lineup(player_ids uuid[], captain_id uuid)`: exactly 5 distinct players, captain among
  them, each player owned (at least one `collection_items` row) **and eligible** (see 9.3),
  rate limit (20 saves per Eastern day, raises `RATE_LIMITED:lineup`). Always writes the draft.
- Lock (`lock_game_day()`, pg_cron every 5 minutes, pure SQL): when `now() >= first_tip_at`,
  copies every draft into `lineups` for that day. Edits after that apply to the next day,
  because the draft is only snapshotted at the next lock. A draft created after the lock waits.
- Removing a card after the lock never changes a locked lineup.

## 2. Jobs and scoring

- `job-schedule` (new, early morning Eastern, after `job-stats`): one Highlightly request for
  today's games -> `game_days.first_tip_at` = earliest tip-off. No games = no lock, no score.
  Quota: 16 + 1 requests per day of 100.
- `score_game_day(day)` (SQL, called at the end of `job-stats`, idempotent):
  `points(player) = sum(weight * stat)` over the player's lines that day, 0 if no line or 0
  minutes (DNP), captain x2, rounded to 0.1. Then standings snapshots (week, season, each
  league), badges for finished weeks, abuse heuristics. Preseason days and days outside
  `fantasy_seasons` are not scored.
- Week = Monday to Sunday, Eastern. Season = regular season only.
- League standings count days from the member's `joined_day` (MPG style: late joiners start at
  0, shown as "joined Oct 24").
- Morning: `morning_report_for()` gains a `vault_score` block (yesterday's total, top performer,
  global and league rank changes); the email and the Last night screen use it; push text
  "Your lineup scored 184 pts last night".

## 3. Rankings, leagues, limits

- Global: weekly and season standings of users with a username and no opt-out. Users without a
  username play, see their own score and rank, and are invited to pick one to appear.
- Private leagues: create (name), invite by code or link `/leagues/join/<code>`, leave, owner
  can remove a member and regenerate the code. League page: standings by week and season,
  each member's latest score and captain.
- Free: global ranking, 1 private league (owned or joined), current week, current season
  total and the last 7 days of own scores. Premium: unlimited leagues, every past week, full
  season history, per-player stat breakdowns. The score itself is identical for everybody.
- Card limit: free collections cap at 300 cards. That bounds the pool of eligible players,
  not the score; 300 cards cover far more than 5 players, so no practical advantage. Noted in
  the rules.
- Badges (no other reward, ever): Weekly winner (global, and per league), Perfect captain (the
  captain was the lineup's top scorer), 200 club (a 200-point night), Iron five (all five
  played every night of a week).

## 4. Fairness and legal guardrails

- Rules page (in the app) and a new Terms section: free to play, no entry fee, no cash, no
  cards, no gift prizes, badges only; collections are self-declared; points come only from
  real box scores, never from card value or rarity; Premium never changes points.
- One account per email (Supabase Auth default). Lineup save rate limit as above.
- Flags for review (`abuse_flags`, a weekly list emailed to `EMAIL_ADMIN`): many cards added
  and removed within 48 h around lineups, eligibility churn on the same players, lineup saves
  hitting the rate limit several days in a row, several accounts joining the same leagues
  together within minutes.
- Ranking and league pages exist only in the web app (app.hoopticker.com, already noindex
  and robots disallow). The public "How scoring works" page is on hoopticker.com, indexable.

## 5. Quick add by text (replaces the scan on the web)

- One input on the Add page: "2025 Chrome Flagg 251 gold /50".
- Edge function `quick-add-match` reusing `scan-match/matcher.ts`, extended with: parallel
  names and common slang (gold, refractor, ref, prizm-like words mapped to our parallel names,
  "/50" serial runs), set aliases (chrome, sapphire, cosmic, midnight, flagship, hoops,
  bowman, update), seasons written "2025", "25-26", "2025-26". Deterministic, no paid AI.
- Returns the top 3 (card + parallel + grade RAW, serial number when given); one click adds
  through the existing collection service, limits unchanged.
- Test set: 50 realistic inputs written by hand from our real checklists (typos, nicknames,
  missing set, wrong season) in a Deno test that prints the top-1 and top-3 match rate. Target
  top-3 >= 90%, reported before deploying.

## 6. Screens (apps/mobile, browser first, same code on native)

Routes: `/game` (lineup court + scoreboard, new tab "Game"), `/game/standings`,
`/leagues`, `/leagues/:id`, `/leagues/join/:code`, `/game/rules`; the recap goes on top of
`/tabs/last-night`; username and opt-out in Profile.

- **Lineup court**: half-court from above, drawn in CSS and inline SVG (hardwood with layered
  gradients, court lines, key, arc), 5 spots on the floor, captain armband, players as foil
  card frames with name and last-5 form. Desktop: drag from the bench drawer to a spot (Angular
  CDK drag-drop, lazy route). Mobile: tap a spot, then a player. Lock state: court dims, a
  padlock and "Locked until tomorrow's first tip".
- **Scoreboard / jumbotron**: big condensed LED-style digits, shot-clock countdown to the lock,
  tonight's games count, yesterday's total and rank.
- **Last night recap**: final score of the lineup, "Player of the game" spotlight, a box score
  table (MIN, PTS, REB, AST, STL, BLK, TO, FPTS), captain row marked x2, rank change.
- **Standings**: broadcast leaderboard, rank, movement arrow, streak, points; week / season
  tabs; your row pinned.
- **League page**: header with invite code and share button, standings, members' latest
  scores; empty state for a league with one member ("Invite 3 friends").
- Empty states: no username, no lineup yet, no eligible players (link to Quick add), no games
  tonight, off day.
- Motion: score roll-up, spotlight sweep on the player of the game, confetti-free celebration
  for a weekly win (a short light burst on the trophy badge). All behind
  `prefers-reduced-motion: no-preference`.
- Arena look within our system: a scoped `.cv-arena` token layer in `tokens.scss` (ink
  background `#121417`, lime accent, spotlight gradients), Outfit everywhere, plus one condensed
  numeric face for the scoreboard digits only (see 9.4). No logos, no team colors on the court,
  no arena names.
- Quality: 44 px tap targets, AA contrast checked on every surface including over the
  hardwood, textures as CSS (no image download), lazy routes, LCP target under 2.5 s.
- Process: `frontend-design` skill for the direction, `ui-ux-pro-max` review of every screen,
  then screenshots (desktop and phone) of the court, the scoreboard, the recap and a league
  page sent to Martin **before any deploy**.

## 7. Website

- `hoopticker.com/fantasy-basketball-scoring` (title "How Vault Score works"): scoring table
  read from `fantasy_scoring`, lock rule, captain, DNP, seasons, the no-prize rule, an example
  night. Indexable, in `sitemaps/pages.xml`, SEO checklist of `docs/seo-rules.md` in the PR.
- Terms: new "Vault Score and Leagues" section (free, badges only, self-declared collections).

## 8. Tests and delivery

- pgTAP: scoring weights and rounding, DNP = 0, captain x2, preseason not scored, lock time and
  "after the lock applies to tomorrow", eligibility, rate limit, username filter, opt-out,
  standings (week, season, league from `joined_day`), league membership and RLS, private
  league limit (free 1, premium unlimited), Premium history gating, badges.
- Deno: turnovers parsing, `job-schedule`, quick add parser and the 50-input match rate.
- Phases, one commit each, typecheck and tests green: (1) data, turnovers, schedule, lock,
  scoring; (2) standings, leagues, limits, badges, abuse flags; (3) quick add; (4) screens and
  arena tokens; (5) website page, Terms, morning email and push; (6) screenshots, your review,
  then deploy (migrations, functions, cron, web app, website) and push.

## 9. Questions for Martin

1. (blocking, legal) Using NBA player names and their stats in a free fantasy game with no
   prizes. Player names and stats are already shown as factual information; a fantasy game is
   a different use. I am not able to confirm this is fine: please confirm or check.
2. (blocking, API terms) Highlightly's terms for computing and displaying derived fantasy
   points from their box scores. Same rule: I do not guess on API terms.
3. Eligibility delay: a player counts as owned for a game day only if the card was added
   before the previous game day's lock (in practice, at least the day before). Without it,
   anyone can add a star's card 5 minutes before tip-off. Recommended: yes.
4. Scoreboard digits: add one condensed open-source face (Barlow Condensed, SIL OFL,
   self-hosted, digits-only subset of a few KB) next to Outfit. Recommended: yes.
5. Topps images in the app: the written permission covers the public website only, so the
   court shows our foil frames. Confirm, or check the email if you want official images in
   the app.
6. Season 2026-27 regular season end date for `fantasy_seasons` (I will read it from the
   official schedule if you prefer).
7. Public page slug `/fantasy-basketball-scoring` and the new "Game" tab in the app.
