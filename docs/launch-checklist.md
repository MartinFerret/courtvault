# Minimal public launch (website + waitlist + daily movers)

Decided 2026-10-07: launch the public website before the NBA season (two weeks) with the
Supabase cloud project, the real Highlightly and eBay keys, the waitlist and the daily movers
page. Phase 2 (web app) resumes right after. Rules referenced from `docs/seo-rules.md`.

## 1. What Martin provides (accounts and keys)

Never paste a secret in the chat. Put keys in the gitignored `.env` files named below, or type
the command yourself in this terminal with the `!` prefix.

| #   | What                                                                                                                                                      | Where it goes                                                                                                                                                                                     | Why                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Domain `hoopticker.com` bought, registrar DNS access                                                                                                       | you                                                                                                                                                                                               | canonical host (R56)                                        |
| 2   | Done 2026-10-07: Supabase project `lufpytmtwocqgooxedfx` (Free, eu-west-1), migrations, functions, secrets and catalog deployed                                                 | `! supabase login` then `! supabase link --project-ref <ref>` (asks the password); anon key to `apps/web/.env` and GitHub secrets; service role key only to `scripts/.env` for the catalog import | database, auth, functions, cron                             |
| 3   | Highlightly subscription: API key (`x-rapidapi-key`)                                                                                                      | `supabase/functions/.env` as `HIGHLIGHTLY_API_KEY`                                                                                                                                                | box scores, ~16 calls per night, free plan 100/day          |
| 4   | eBay developer account, **production** keyset: client id + client secret (Browse API, marketplace EBAY_US)                                                | `supabase/functions/.env` as `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`                                                                                                                               | prices, up to 3,500 calls per night                         |
| 5   | eBay Partner Network campaign id (optional)                                                                                                               | `EBAY_AFFILIATE_CAMPAIGN_ID`                                                                                                                                                                      | affiliate buy links; plain links without it                 |
| 6   | Done 2026-10-07: Netlify site `hoopticker` created from the CLI, deployed from the repository root with `netlify deploy --prod --filter @courtvault/web` (config in the root `netlify.toml`) | Netlify dashboard                                                                                                                                                                                 | hosting                                                     |
| 7   | Search Console: **Domain** property for `hoopticker.com`, copy the `google-site-verification=…` TXT token                                                  | you add it at the registrar (TXT on the apex)                                                                                                                                                     | R60; I declare the sitemap once it is verified              |
| 8   | GitHub repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`                                                                                          | GitHub > Settings > Secrets                                                                                                                                                                       | keep-alive workflow (Free projects pause after 7 idle days) |

Not needed for this launch: Brevo (no email is sent by the website), RevenueCat, Apple and
Google sign-in, Cloudflare Pages (web app comes with phase 2).

## 2. What I do once the items above exist

1. `supabase db push` (migrations), production seed (plan limits, Vault secrets
   `functions_url` and `job_secret`), `supabase functions deploy`, `supabase secrets set
--env-file supabase/functions/.env` with `STATS_PROVIDER=highlightly`, `PRICE_PROVIDER=ebay`,
   `PUSH_PROVIDER=log`, `JOB_SECRET`, `WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET`.
2. Catalog import of the two official 2025-26 checklists with the service role key.
3. First runs by hand: `pnpm job:stats -- --force`, `pnpm job:prices -- --force`; check
   `price_coverage` and the eBay call count; then let cron take over (schedules in
   `supabase/migrations/20261005000800_jobs_and_cron.sql`, UTC at both Eastern offsets).
4. Netlify environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL=https://hoopticker.com`, `REVALIDATE_SECRET`,
   `NEXT_PUBLIC_SLUGS_FROZEN=false`. Custom domain `hoopticker.com` with the DNS records
   Netlify shows (apex record plus, if you keep `www`, a CNAME that Netlify redirects in one hop
   to the apex, R56/R57). HTTPS is automatic.
5. Smoke test on the live site: homepage, waitlist form (row in `waitlist`), `/last-night`,
   `/robots.txt`, `/sitemap.xml`, a 404, the `/api/revalidate` ping from a job.
6. Search Console: sitemap `https://hoopticker.com/sitemap.xml`, baseline noted (R114).
7. PageSpeed mobile on the homepage (R61), Rich Results test on the homepage markup (R88).

## 3. Indexing policy at launch (R25, R49, R55)

Slugs were frozen on 2026-10-07. Indexing is quality-gated by the `page_index_status` view:

| Page | Path | Indexed when | Sitemap |
| --- | --- | --- | --- |
| Homepage | `/` | always | `sitemaps/pages.xml` |
| Checklists | `/checklists/<set>-basketball` | the set has cards | `sitemaps/checklists.xml` |
| Players | `/players/<name>-rookie-cards` or `-cards` | at least one card | `sitemaps/players.xml` |
| Cards | `/cards/<set>-<player>-rookie-card-<n>` or `-card-<n>` | one parallel priced with 5+ listings | `sitemaps/cards.xml` |
| Daily movers | `/trending-basketball-cards`, `/<date>` | a game night exists | `sitemaps/movers.xml` |
| Rookie ranking | `/most-valuable-basketball-rookie-cards` | always | `sitemaps/pages.xml` |
| Waitlist, search, legal | unchanged | never (R55) or indexable but out of the sitemap (R49) | - |

`/sitemap.xml` is the index; each child lists only indexable pages with the real lastmod of
the data (R50). Pages below the threshold carry `noindex, follow` and enter the sitemap by
themselves once they qualify (ISR, no deploy).

## 4. Pre-launch checklist from `docs/seo-rules.md`

- [ ] Keyword map created (R7, R8 to R16): done, volumes pending
- [ ] Architecture by journey, category pages (R19, R20): phase 3
- [ ] Final slugs (R22 to R25): pending volumes, mitigated by the indexing policy above
- [x] Titles `[Keyword]: [promise] | Brand`, 60 max (R27 to R32): layout template, homepage pinned by a test
- [x] Unique meta descriptions, 155 max (R33, R34): homepage pinned by a test
- [x] One H1 with the keyword, title and H1 consistent (R35 to R37): homepage
- [x] Commercial keyword only on the commercial page (R5, R32): guides and About do not exist yet
- [ ] Contextual links to the commercial page (R42): with the guides, phase 4
- [x] Identical footer everywhere (R46)
- [x] Sitemap: useful pages only, real lastmod (R49 to R51)
- [x] robots.txt, canonical, noindex (R52 to R55)
- [ ] One host, zero internal redirects (R56, R57): verify after DNS
- [x] 404 page (R59)
- [ ] LCP mobile under 2.5 s on the homepage (R61 to R67): measure on the live site
- [x] Single source for prices and names (R69): `PRICING`, `BRAND_NAME`
- [x] No duplicated FAQ, no hard-coded dated element (R70, R73)
- [ ] Buttons and microcopy reread against the promise (R74): at launch
- [x] No permanent struck-through price (R75)
- [ ] Author, dates, About and trust page (R77 to R80): phase 4, needs Martin's details
- [ ] Structured data validated per page type (R85 to R88): homepage at launch, others in phase 3
- [x] Multilingual: single language (R89)
- [ ] Search Console connected, sitemap declared, baseline noted (R60, R114)
- [ ] Link plan started (R109 to R111): Reddit presence, Product Hunt later
