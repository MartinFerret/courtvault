import Link from 'next/link';
import { formatParallel, GRADE_LABELS } from '@courtvault/shared';

/**
 * Generic "foil" card frame: no imagery, the rarity drives the finish.
 * base -> matte, unnumbered variant -> refractor, numbered -> gold, 1/1 -> red.
 */
export function foilTier(parallelName: string, serialRun: number | null): 'base' | 'refractor' | 'numbered' | 'one' {
  if (serialRun === 1) return 'one';
  if (serialRun !== null) return 'numbered';
  if (parallelName.toLowerCase() === 'base') return 'base';
  return 'refractor';
}

export function FoilCard({
  href,
  number,
  player,
  setLabel,
  parallelName,
  serialRun,
  grade,
  isRookie,
  footer,
}: {
  href: string;
  number: string;
  player: string;
  setLabel: string;
  parallelName: string;
  serialRun: number | null;
  grade: 'RAW' | 'PSA9' | 'PSA10';
  isRookie: boolean;
  footer?: React.ReactNode;
}) {
  const tier = foilTier(parallelName, serialRun);
  return (
    <Link href={href} className={`foil foil--${tier}`} aria-label={`${player} #${number} ${formatParallel(parallelName, serialRun)} ${GRADE_LABELS[grade]}`}>
      <span className="foil__number">#{number}</span>
      <span className="foil__player">
        {player} {isRookie ? <span className="badge">RC</span> : null}
      </span>
      <span className="foil__set">{setLabel}</span>
      <span className="foil__parallel">
        {formatParallel(parallelName, serialRun)} · {GRADE_LABELS[grade]}
      </span>
      {footer ? <span className="foil__footer">{footer}</span> : null}
    </Link>
  );
}
