// Renders the favicon set from src/app/icon.svg with sharp (bundled with Next). Run once after
// changing the mark: node tools/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(
  resolve(
    import.meta.dirname,
    '../../../node_modules/.pnpm/sharp@0.35.5_@types+node@22.20.5/node_modules/sharp',
  ),
);

const root = resolve(import.meta.dirname, '..');
const svg = readFileSync(resolve(root, 'src/app/icon.svg'));
const png = (size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

// ICO container with PNG entries (16, 32, 48): what browsers and OS pickers expect.
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = [];
  const blobs = [];
  let offset = 6 + 16 * entries.length;
  for (const { size, data } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    dir.push(e);
    blobs.push(data);
  }
  return Buffer.concat([header, ...dir, ...blobs]);
}

const sizes = [16, 32, 48];
const entries = [];
for (const size of sizes) entries.push({ size, data: await png(size) });
writeFileSync(resolve(root, 'src/app/favicon.ico'), ico(entries));
writeFileSync(resolve(root, 'src/app/apple-icon.png'), await png(180));
writeFileSync(resolve(root, 'public/icon-192.png'), await png(192));
writeFileSync(resolve(root, 'public/icon-512.png'), await png(512));
// The Angular app shares the favicon.
writeFileSync(resolve(root, '../mobile/public/favicon.ico'), ico(entries));
writeFileSync(resolve(root, '../mobile/public/icon.svg'), svg);
console.log('icons written');
