// Real market data for the video (read only, cloud): current values of well-known cards and
// their change since the previous recorded value. Writes src/data/market.json.
// Usage: node tools/market.mjs <SUPABASE_URL> <SERVICE_ROLE_KEY>
import { writeFileSync } from 'node:fs';
const [, , url, key] = process.argv;
const get = async (path) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
};
const current = await get(
  'current_prices?select=parallel_id,grade,price_cents,price_kind,captured_at,parallels!inner(name,serial_run,cards!inner(number,is_rookie,players!inner(name,slug),card_sets!inner(name)))&grade=eq.RAW&order=price_cents.desc&limit=1000',
);
const ids = current.map((c) => c.parallel_id);
const points = [];
for (let i = 0; i < ids.length; i += 150) {
  points.push(
    ...(await get(`price_points?select=parallel_id,grade,price_cents,captured_at&grade=eq.RAW&parallel_id=in.(${ids.slice(i, i + 150).join(',')})&order=captured_at.desc&limit=5000`)),
  );
}
const prevBy = new Map();
for (const p of points) {
  const list = prevBy.get(p.parallel_id) ?? [];
  list.push(p);
  prevBy.set(p.parallel_id, list);
}
const rows = current.map((c) => {
  const hist = (prevBy.get(c.parallel_id) ?? []).sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  const prev = hist.find((h) => h.captured_at < c.captured_at && h.price_cents !== c.price_cents) ?? null;
  const pa = c.parallels;
  const last = pa.cards.players.name.split(' ').slice(-1)[0];
  const set = pa.cards.card_sets.name.replace(/^Topps /, '').replace(/^Basketball$/, 'Topps').toUpperCase();
  return {
    label: `${last.toUpperCase()} ${set} #${pa.cards.number}${pa.name !== 'Base' ? ` ${pa.name.toUpperCase()}` : ''}`,
    player: pa.cards.players.name,
    set: pa.cards.card_sets.name,
    parallel: pa.name,
    serialRun: pa.serial_run,
    rookie: pa.cards.is_rookie,
    cents: c.price_cents,
    kind: c.price_kind,
    prevCents: prev?.price_cents ?? null,
    changePct: prev ? Math.round(((c.price_cents - prev.price_cents) / prev.price_cents) * 1000) / 10 : null,
    at: c.captured_at,
  };
});
const famous = ['Cooper Flagg', 'Victor Wembanyama', 'Shai Gilgeous-Alexander', 'Dylan Harper', 'Ace Bailey', 'VJ Edgecombe', 'Nikola Jokić', 'Luka Dončić', 'Stephen Curry', 'LeBron James', 'Anthony Edwards', 'Giannis Antetokounmpo', 'Kon Knueppel'];
const pick = rows
  .filter((r) => famous.includes(r.player) && r.cents >= 500)
  .sort((a, b) => (b.changePct !== null) - (a.changePct !== null) || Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0) || b.cents - a.cents);
const movers = rows.filter((r) => r.changePct !== null && r.cents >= 500).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
const out = { generatedAt: new Date().toISOString(), source: 'CardSight AI via HoopTicker (eBay sales and listings), raw values', tape: pick.slice(0, 14), movers: movers.slice(0, 10), moversCount: movers.length };
writeFileSync(new URL('../src/data/market.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ current: current.length, withChange: movers.length, tape: out.tape.slice(0, 6).map((t) => `${t.label} $${(t.cents / 100).toFixed(2)} ${t.changePct ?? ''}`) }));
