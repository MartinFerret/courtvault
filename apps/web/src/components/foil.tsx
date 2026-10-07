import type { CSSProperties } from 'react';
import { foilClass, foilTier } from '@courtvault/shared';

/** Foil frame class and CSS variables for a parallel (same rule as the app). */
export function foilProps(
  parallelName: string,
  serialRun: number | null,
): { className: string; style: CSSProperties } {
  const foil = foilTier(parallelName, serialRun);
  return {
    className: foilClass(foil),
    style: { '--foil-hue': foil.hue, '--foil-sat': `${foil.saturation}%` } as CSSProperties,
  };
}
