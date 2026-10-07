import manifest from './image-manifest.json';

/**
 * Official Topps images, served from our own files (never hotlinked), listed in
 * image-manifest.json by tools/images.mjs. A card without an image keeps the foil frame.
 * Scope and credit: docs/legal/topps-permission.md.
 */
interface ImageEntry {
  width: number;
  height: number;
}
interface Manifest {
  cards: Record<string, ImageEntry>;
  sets: Record<string, ImageEntry>;
}
const images = manifest as Manifest;

export const IMAGE_CREDIT = 'Card images courtesy of Topps.';

export function cardImage(
  publicSlug: string,
): { src: string; width: number; height: number } | null {
  const entry = images.cards[publicSlug];
  return entry ? { src: `/img/cards/${publicSlug}.webp`, ...entry } : null;
}

export function setImage(setSlug: string): { src: string; width: number; height: number } | null {
  const entry = images.sets[setSlug];
  return entry ? { src: `/img/sets/${setSlug}.webp`, ...entry } : null;
}

/** True once at least one official image is published: footer wording and credits follow it. */
export function hasOfficialImages(): boolean {
  return Object.keys(images.cards).length + Object.keys(images.sets).length > 0;
}
