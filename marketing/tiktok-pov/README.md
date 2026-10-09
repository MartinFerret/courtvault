# HoopTicker TikTok: "POV" video and carousel

Remotion project for the POV script (6 slides, 1080 x 1920). Art direction: HoopTicker tokens
(ink arena, lime accent, Outfit, Barlow Condensed scoreboard digits, foil frames, ticker tape).

- `npm run dev`: Remotion Studio (http://localhost:3000 by default).
- Video: `npx remotion render PovVideo out/HoopTicker-POV-A.mp4 --props='{"topps":false}'`.
- Carousel images (photo mode): render the `Carousel/Slide*` compositions with `npx remotion still`.
- Real market data for the tape and the price tags: `node tools/market.mjs <SUPABASE_URL> <SERVICE_ROLE_KEY>`
  (read only), writes `src/data/market.json`. Nothing in the video is invented: values are the
  live HoopTicker values (CardSight AI, eBay sales and listings), changes are real recorded changes.
- Phone screens (`public/screen-*.png`): the local web app with the real box scores of the night.

Version B (`"topps": true`) uses official Topps card images. The Topps permission covers the
website only (`docs/legal/topps-permission.md`): do not publish version B before Martin confirms,
in the original email, that social media is covered.

Renders use the installed Google Chrome (`remotion.config.ts`): the downloaded headless shell
crashes on this Mac.
