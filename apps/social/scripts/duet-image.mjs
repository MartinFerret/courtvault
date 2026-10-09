// Renders the static Duet image (PNG) from real data, locally.
// Usage (repo root): pnpm image:duet <card-slug>
// Writes exports/social/duet-image-<slug>-1080x960.png and -1080x1920.png.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, fetchCard, repo } from './card-data.mjs';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: pnpm image:duet <card-slug>   (the card page slug on hoopticker.com)');
  process.exit(1);
}
const data = await fetchCard(slug);
const s = data.card.publicSlug;
const out = join(repo, 'exports/social');
mkdirSync(out, { recursive: true });
const propsFile = join(out, `duet-image-${s}.props.json`);
writeFileSync(propsFile, JSON.stringify({ data }, null, 2));
console.log(`${data.card.season} ${data.card.set} #${data.card.number} ${data.card.player}`);
for (const p of data.prices)
  console.log(
    `  ${p.grade}: ${p.price_cents} cents (${p.price_kind}, n=${p.sample_size}, ${p.captured_at})`,
  );
const files = [];
for (const [id, size] of [
  ['DuetImageHalf', '1080x960'],
  ['DuetImageFull', '1080x1920'],
]) {
  const file = join(out, `duet-image-${s}-${size}.png`);
  execFileSync(
    'npx',
    [
      'remotion',
      'still',
      'src/index.ts',
      id,
      file,
      `--props=${propsFile}`,
      '--image-format=png',
      '--log=error',
    ],
    { cwd: app, stdio: 'inherit' },
  );
  files.push(file);
}
console.log('\nRendered:');
for (const f of files) console.log(`  ${f}`);
