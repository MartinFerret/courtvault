# Official Topps images (website only)

Scope and conditions: `docs/legal/topps-permission.md`. Nothing here is used before that file
exists. Images come only from official Topps sources (product pages, collector's guides, press
kits, the Topps store CDN). They are optimised by `node apps/web/tools/images.mjs` into
`apps/web/public/img` and listed in `apps/web/src/lib/image-manifest.json`; the site credits
"Card images courtesy of Topps" wherever one appears. Originals in this folder are not
committed (gitignored), only the optimised WebP files are.

Drop files here, named by the public slug of the page they belong to:

- `cards/<card public slug>.png|jpg` (front of the exact card and parallel, e.g.
  `cards/2025-26-topps-chrome-cooper-flagg-rookie-card-251.jpg` for the Base card)
- `sets/<set slug>.png|jpg` (box or set key visual, e.g. `sets/2025-26-topps-chrome.jpg`)

## Wanted first (the pages that carry the most traffic)

Sets (box or key visual): 2025-26-topps-basketball, 2025-26-topps-chrome, 2025-26-topps-chrome-sapphire,
2025-26-topps-finest, 2025-26-topps-hoops, 2025-26-topps-cosmic-chrome, 2025-26-topps-chrome-updates,
2025-26-topps-midnight, 2025-26-bowman.

Cards (Base parallel front):
2025-26-topps-chrome-cooper-flagg-rookie-card-251, 2025-26-topps-basketball-cooper-flagg-rookie-card-201,
2025-26-topps-chrome-dylan-harper-rookie-card-252, 2025-26-topps-chrome-ace-bailey-rookie-card-255,
2025-26-topps-chrome-vj-edgecombe-rookie-card-253, 2025-26-topps-chrome-kon-knueppel-rookie-card-254,
2025-26-topps-chrome-victor-wembanyama-card-221, 2025-26-topps-chrome-lebron-james-card-23,
2025-26-topps-chrome-stephen-curry-card-30, 2025-26-topps-chrome-nikola-jokic-card-15,
and one card per rookie of 2025-26 Topps Chrome (numbers 251 to 299).
