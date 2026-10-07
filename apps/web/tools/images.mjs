// Optimises the official Topps images dropped in data/images/topps/ into public/img and
// writes src/lib/image-manifest.json. File names decide the target:
//   cards/<card public slug>.{png,jpg,jpeg,webp}  -> public/img/cards/<slug>.webp (960px wide max)
//   sets/<set slug>.{png,jpg,jpeg,webp}           -> public/img/sets/<slug>.webp (1200px wide max)
// Run: node tools/images.mjs
import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const sharpDir = readdirSync(resolve(root, '../../node_modules/.pnpm')).find((d) =>
  d.startsWith('sharp@'),
);
const sharp = createRequire(import.meta.url)(
  resolve(root, '../../node_modules/.pnpm', sharpDir, 'node_modules/sharp'),
);
const inbox = resolve(root, '../../data/images/topps');
const manifest = { cards: {}, sets: {} };

async function convert(kind, maxWidth) {
  const dir = resolve(inbox, kind);
  if (!existsSync(dir)) return;
  mkdirSync(resolve(root, 'public/img', kind), { recursive: true });
  for (const file of readdirSync(dir)) {
    if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
    const slug = basename(file, extname(file));
    if (!/^[a-z0-9-]+$/.test(slug)) {
      console.warn(`skipped ${kind}/${file}: name must be the public slug`);
      continue;
    }
    const image = sharp(resolve(dir, file))
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true });
    const { width, height } = await image
      .webp({ quality: 82, effort: 5 })
      .toBuffer({ resolveWithObject: true })
      .then((r) => r.info);
    await image
      .webp({ quality: 82, effort: 5 })
      .toFile(resolve(root, 'public/img', kind, `${slug}.webp`));
    manifest[kind][slug] = { width, height };
  }
}

await convert('cards', 960);
await convert('sets', 1200);
writeFileSync(
  resolve(root, 'src/lib/image-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `cards ${Object.keys(manifest.cards).length}, sets ${Object.keys(manifest.sets).length}`,
);
