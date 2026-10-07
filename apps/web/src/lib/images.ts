import manifest from './image-manifest.json';

/**
 * Official Topps images, served from our own files (never hotlinked), listed in
 * image-manifest.json by tools/images.mjs. A card without an image keeps the foil frame; an
 * image is only ever shown for the exact card and parallel it depicts. Scope and credit:
 * docs/legal/topps-permission.md.
 */
interface Size {
  width: number;
  height: number;
}
interface CardEntry extends Partial<Size> {
  parallels: Record<string, Size>;
}
interface Manifest {
  cards: Record<string, CardEntry>;
  sets: Record<string, Size & { caption: string | null }>;
  gallery: Record<string, (Size & { name: string; caption: string })[]>;
}
const images = manifest as unknown as Manifest;

export const IMAGE_CREDIT = 'Card images courtesy of Topps.';

/** "Yellow Refractor" -> "yellow-refractor", the file suffix used by the pipeline. */
const parallelSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function cardImage(
  publicSlug: string,
  parallelName = 'Base',
): (Size & { src: string }) | null {
  const entry = images.cards[publicSlug];
  if (!entry) return null;
  if (parallelName === 'Base') {
    return entry.width && entry.height
      ? { src: `/img/cards/${publicSlug}.webp`, width: entry.width, height: entry.height }
      : null;
  }
  const p = entry.parallels[parallelSlug(parallelName)];
  return p ? { src: `/img/cards/${publicSlug}--${parallelSlug(parallelName)}.webp`, ...p } : null;
}

export function setImage(setSlug: string): (Size & { src: string; caption: string | null }) | null {
  const entry = images.sets[setSlug];
  return entry ? { src: `/img/sets/${setSlug}.webp`, ...entry } : null;
}

export function setGallery(
  setSlug: string,
): (Size & { src: string; name: string; caption: string })[] {
  return (images.gallery[setSlug] ?? []).map((g) => ({
    ...g,
    src: `/img/gallery/${setSlug}/${g.name}.webp`,
  }));
}

/** True once at least one official image is published: footer wording and credits follow it. */
export function hasOfficialImages(): boolean {
  return (
    Object.keys(images.cards).length +
      Object.keys(images.sets).length +
      Object.keys(images.gallery).length >
    0
  );
}
