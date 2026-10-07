// Optimises the official Topps images dropped in data/images/topps/ into public/img and writes
// src/lib/image-manifest.json. File names decide the target:
//   cards/<card public slug>.png|jpg                 -> the Base card (960px wide max)
//   cards/<card public slug>--<parallel slug>.png    -> that parallel of the card
//   sets/<set slug>.png|jpg (+ sets/captions.json)   -> the set's key visual (1200px)
//   gallery/<set slug>/<name>.png (+ captions.json)  -> inserts and autographs shown as a gallery
// Originals never ship; only the WebP output does. Run: node apps/web/tools/images.mjs
import { readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from 'node:fs';
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
const manifest = { cards: {}, sets: {}, gallery: {} };
const SLUG = /^[a-z0-9-]+$/;

async function toWebp(src, dest, maxWidth) {
  const image = sharp(src)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 });
  const { info } = await image.toBuffer({ resolveWithObject: true });
  await image.toFile(dest);
  return { width: info.width, height: info.height };
}
const captions = (dir) =>
  existsSync(resolve(dir, 'captions.json'))
    ? JSON.parse(readFileSync(resolve(dir, 'captions.json'), 'utf8'))
    : {};
const images = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)) : [];

// Cards and their parallels.
mkdirSync(resolve(root, 'public/img/cards'), { recursive: true });
for (const file of images(resolve(inbox, 'cards'))) {
  const name = basename(file, extname(file));
  const [slug, parallel] = name.split('--');
  if (!SLUG.test(slug) || (parallel && !SLUG.test(parallel))) {
    console.warn(`skipped cards/${file}: names must be slugs`);
    continue;
  }
  const size = await toWebp(
    resolve(inbox, 'cards', file),
    resolve(root, 'public/img/cards', `${name}.webp`),
    960,
  );
  manifest.cards[slug] ??= { parallels: {} };
  if (parallel) manifest.cards[slug].parallels[parallel] = size;
  else Object.assign(manifest.cards[slug], size);
}
// Sets.
mkdirSync(resolve(root, 'public/img/sets'), { recursive: true });
const setCaptions = captions(resolve(inbox, 'sets'));
for (const file of images(resolve(inbox, 'sets'))) {
  const slug = basename(file, extname(file));
  if (!SLUG.test(slug)) continue;
  const size = await toWebp(
    resolve(inbox, 'sets', file),
    resolve(root, 'public/img/sets', `${slug}.webp`),
    1200,
  );
  manifest.sets[slug] = { ...size, caption: setCaptions[slug] ?? null };
}
// Galleries per set.
const galleryRoot = resolve(inbox, 'gallery');
if (existsSync(galleryRoot)) {
  for (const setSlug of readdirSync(galleryRoot).filter((d) =>
    statSync(resolve(galleryRoot, d)).isDirectory(),
  )) {
    const dir = resolve(galleryRoot, setSlug);
    const caps = captions(dir);
    mkdirSync(resolve(root, 'public/img/gallery', setSlug), { recursive: true });
    manifest.gallery[setSlug] = [];
    for (const file of images(dir)) {
      const name = basename(file, extname(file));
      if (!SLUG.test(name)) continue;
      const size = await toWebp(
        resolve(dir, file),
        resolve(root, 'public/img/gallery', setSlug, `${name}.webp`),
        720,
      );
      manifest.gallery[setSlug].push({ name, caption: caps[name] ?? name, ...size });
    }
  }
}
writeFileSync(
  resolve(root, 'src/lib/image-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `cards ${Object.keys(manifest.cards).length}, sets ${Object.keys(manifest.sets).length}, galleries ${Object.keys(manifest.gallery).length}`,
);
