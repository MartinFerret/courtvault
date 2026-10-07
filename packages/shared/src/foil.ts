/**
 * Foil frame for a parallel, used by the app's card tiles. The hue comes from the color word
 * in the parallel's name, the tier from its print run. Pure presentation data: no prices.
 */
export type FoilTier = 'none' | 'chrome' | 'color' | 'short' | 'one';

export interface Foil {
  tier: FoilTier;
  /** CSS hue in degrees and saturation, for the `color`, `short` tiers. */
  hue: number;
  saturation: number;
}

const COLOR_WORDS: [RegExp, number, number][] = [
  [/\bgold(en)?\b/i, 44, 92],
  [/\borange\b/i, 26, 95],
  [/\bred\b/i, 352, 90],
  [/\b(magenta|pink)\b/i, 322, 85],
  [/\bpurple\b/i, 272, 80],
  [/\bsapphire\b/i, 222, 90],
  [/\bblue\b/i, 214, 90],
  [/\baqua\b/i, 186, 85],
  [/\bteal\b/i, 172, 70],
  [/\bgreen\b/i, 142, 75],
  [/\byellow\b/i, 54, 95],
  [/\bwood\b/i, 28, 48],
  [/\bblack(out)?\b/i, 232, 12],
  [/\bfrozen/i, 200, 70],
];

export function foilTier(parallelName: string, serialRun: number | null | undefined): Foil {
  const name = parallelName.trim();
  const run = serialRun ?? null;
  const color = COLOR_WORDS.find(([re]) => re.test(name));
  if (run === 1 || /superfractor|foilfractor|first card/i.test(name))
    return { tier: 'one', hue: 0, saturation: 0 };
  if (run !== null && run <= 10)
    return { tier: 'short', hue: color?.[1] ?? 210, saturation: color?.[2] ?? 70 };
  if (run !== null) return { tier: 'color', hue: color?.[1] ?? 210, saturation: color?.[2] ?? 60 };
  if (/^base$/i.test(name)) return { tier: 'none', hue: 0, saturation: 0 };
  if (color) return { tier: 'color', hue: color[1], saturation: color[2] };
  return { tier: 'chrome', hue: 210, saturation: 0 };
}

/** CSS classes for a tile: `cv-foil cv-foil--<tier>`, or an empty string for Base. */
export function foilClass(foil: Foil): string {
  return foil.tier === 'none' ? '' : `cv-foil cv-foil--${foil.tier}`;
}
