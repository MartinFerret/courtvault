# @courtvault/social

Short social videos rendered locally with Remotion from real HoopTicker data. Never rendered
on Netlify. Outputs go to `exports/social/` (git-ignored).

## Duet clip: "card value"

    pnpm video:duet <card-slug>      # e.g. 2025-26-topps-chrome-sapphire-cooper-flagg-rookie-card-251

1. `scripts/duet.mjs` reads the card, its Base prices by grade (`latest_prices`) and 30 days of
   Raw history (`public_price_history`) with the public anon key, like the website. The URL and
   key come from `SOCIAL_SUPABASE_*` or `apps/web/.env`. It stops when the card has no Raw price.
2. It saves the rows to `exports/social/duet-<slug>.props.json` and renders
   `duet-<slug>-1080x960.mp4` (bottom half of a Duet) and `duet-<slug>-1080x1920.mp4`,
   30 fps, H.264, no audio.

Rules (`src/model.ts`, tested): a grade line appears only when that grade has a real price,
with the site's state label (`priceKindLabel`). The sparkline is drawn once there are 14 days of
history; before that the slot shows how many sales or listings the Raw value comes from.

Design: the website's stylesheet is imported as is (`--cv-*` tokens, `.foil` frames), Outfit
from `@fontsource-variable/outfit`. No Topps images, no league or team logos. Safe zones:
nothing in the bottom 25% and 120 px clear on the right on both formats.

Preview: `pnpm --filter @courtvault/social studio`, then load a `.props.json` in the props panel.

## Duet image (static PNG)

    pnpm image:duet <card-slug>

Same data and rules as the clip (`scripts/card-data.mjs`), plus the date of the prices. Writes
`exports/social/duet-image-<slug>-1080x960.png` (bottom half of a top/bottom Duet; the lower
part stays free for TikTok's caption) and `-1080x1920.png` (side-by-side Duet, shown at half
width: everything inside the central 80%, extra large text). 60 px minimum margin everywhere.
