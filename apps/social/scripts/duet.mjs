// Renders the TikTok Duet "card value" clip from real data, locally.
// Usage (repo root): pnpm video:duet <card-slug>
// Reads the card, its Base prices by grade and 30 days of history with the public (anon) key,
// exactly like the website, then renders exports/social/duet-<slug>-1080x960.mp4 and -1080x1920.mp4.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const repo = resolve(app, '../..');
const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: pnpm video:duet <card-slug>   (the card page slug on hoopticker.com)');
  process.exit(1);
}

const readEnv = (file) =>
  existsSync(file)
    ? Object.fromEntries(
        readFileSync(file, 'utf8')
          .split('\n')
          .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
          .map((l) => [
            l.slice(0, l.indexOf('=')).trim(),
            l
              .slice(l.indexOf('=') + 1)
              .trim()
              .replace(/^["']|["']$/g, ''),
          ]),
      )
    : {};
const local = readEnv(join(app, '.env'));
const web = readEnv(join(repo, 'apps/web/.env'));
const url =
  process.env.SOCIAL_SUPABASE_URL || local.SOCIAL_SUPABASE_URL || web.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SOCIAL_SUPABASE_ANON_KEY ||
  local.SOCIAL_SUPABASE_ANON_KEY ||
  web.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL or anon key (see apps/social/.env.example).');
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const rest = async (path, init) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers, ...init });
  if (!r.ok) throw new Error(`${path.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.json();
};

const [card] = await rest(
  `cards?select=id,slug,public_slug,number,is_rookie,players(name),card_sets(name,season),parallels(id,name,serial_run)&or=(slug.eq.${slug},public_slug.eq.${slug})&limit=1`,
);
if (!card) throw new Error(`No card with the slug "${slug}".`);
const base = card.parallels.find((p) => p.name === 'Base');
if (!base) throw new Error('This card has no Base parallel.');
const prices = await rest(
  `latest_prices?select=grade,price_cents,price_kind,sale_at,sample_size&parallel_id=eq.${base.id}`,
);
if (!prices.some((p) => p.grade === 'RAW' && p.price_cents !== null)) {
  throw new Error(
    `No Raw price yet for ${card.players.name} #${card.number} (${card.card_sets.name}). Pick a priced card.`,
  );
}
const publicSlug = card.public_slug ?? card.slug;
const history = await rest('rpc/public_price_history', {
  method: 'POST',
  body: JSON.stringify({ p_card_slug: publicSlug, p_days: 30 }),
});

const data = {
  card: {
    publicSlug,
    number: card.number,
    player: card.players.name,
    set: card.card_sets.name,
    season: card.card_sets.season,
    isRookie: card.is_rookie,
    parallel: base.name,
    serialRun: base.serial_run,
  },
  prices: prices.filter((p) => p.price_cents !== null),
  history: history.map((h) => ({ captured_at: h.captured_at, price_cents: h.price_cents })),
  fetchedAt: new Date().toISOString(),
};

const out = join(repo, 'exports/social');
mkdirSync(out, { recursive: true });
const propsFile = join(out, `duet-${publicSlug}.props.json`);
writeFileSync(propsFile, JSON.stringify({ data }, null, 2));
console.log(`${data.card.season} ${data.card.set} #${data.card.number} ${data.card.player}`);
for (const p of data.prices)
  console.log(`  ${p.grade}: ${p.price_cents} cents (${p.price_kind}, n=${p.sample_size})`);
console.log(`  history: ${data.history.length} points in 30 days`);

const files = [];
for (const [id, size] of [
  ['DuetHalf', '1080x960'],
  ['DuetFull', '1080x1920'],
]) {
  const file = join(out, `duet-${publicSlug}-${size}.mp4`);
  execFileSync(
    'npx',
    [
      'remotion',
      'render',
      'src/index.ts',
      id,
      file,
      `--props=${propsFile}`,
      '--codec=h264',
      '--crf=18',
      '--muted',
      '--log=error',
    ],
    { cwd: app, stdio: 'inherit' },
  );
  files.push(file);
}
console.log('\nRendered:');
for (const f of files) console.log(`  ${f}`);
