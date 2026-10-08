// Post-deploy warm-up (SEO audit of 2026-10-08, item 11): a fresh deploy starts with an empty
// ISR cache, so the first visitor of each page waited several seconds. Request the pages that
// matter right after the deploy so that visitor is us. Reads the sitemaps, skips the card pages
// (2,000+, warmed on demand) and warms the rest with a small concurrency.
//
//   node apps/web/tools/warm-up.mjs [--origin=https://hoopticker.com] [--concurrency=6]

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);
const origin = (args.origin ?? 'https://hoopticker.com').replace(/\/$/, '');
const concurrency = Number(args.concurrency ?? 6);
const ua = 'HoopTickerWarmUp/1.0 (+https://hoopticker.com)';

async function text(url) {
  const res = await fetch(url, { headers: { 'user-agent': ua } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

const index = locs(await text(`${origin}/sitemap.xml`)).filter((u) => !u.endsWith('/cards.xml'));
const urls = new Set([`${origin}/`]);
for (const sm of index) for (const u of locs(await text(sm))) urls.add(u);

const queue = [...urls];
const results = { ok: 0, failed: [], slowest: [] };
const started = Date.now();
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      const t = Date.now();
      try {
        const res = await fetch(u, { headers: { 'user-agent': ua } });
        const ms = Date.now() - t;
        if (res.ok) results.ok += 1;
        else results.failed.push(`${res.status} ${u}`);
        results.slowest.push([ms, u]);
      } catch (e) {
        results.failed.push(`${e.message} ${u}`);
      }
    }
  }),
);
results.slowest.sort((a, b) => b[0] - a[0]);
console.log(
  `Warmed ${results.ok}/${urls.size} pages in ${((Date.now() - started) / 1000).toFixed(0)}s` +
    (results.failed.length
      ? `, ${results.failed.length} failed:\n  ${results.failed.join('\n  ')}`
      : ''),
);
console.log(
  'Slowest:',
  results.slowest
    .slice(0, 5)
    .map(([ms, u]) => `${ms}ms ${u.replace(origin, '')}`)
    .join(', '),
);
process.exitCode = results.failed.length ? 1 : 0;
