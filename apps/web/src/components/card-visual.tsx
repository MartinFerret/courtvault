import Image from 'next/image';
import { formatParallel } from '@courtvault/shared';
import { cardImage } from '@/lib/images';
import { foilProps } from './foil';

/**
 * The visual of one card: the official Topps image when we have it (exact card, exact parallel),
 * the foil frame otherwise. Explicit size, lazy unless `priority`.
 */
export function CardVisual({
  publicSlug,
  name,
  number,
  parallelName = 'Base',
  serialRun = null,
  isRookie = false,
  player,
  setLabel,
  size = 'medium',
  priority = false,
}: {
  publicSlug: string;
  name: string;
  number: string;
  parallelName?: string;
  serialRun?: number | null;
  isRookie?: boolean;
  /** Written on the fallback frame (medium and large): the player, then the set. */
  player?: string;
  setLabel?: string;
  size?: 'thumb' | 'medium' | 'large';
  priority?: boolean;
}) {
  const image = cardImage(publicSlug, parallelName);
  const widths = { thumb: 72, medium: 240, large: 360 } as const;
  const width = widths[size];
  if (image) {
    const height = Math.round((image.height / image.width) * width);
    return (
      <Image
        src={image.src}
        alt={name}
        width={width}
        height={height}
        sizes={`${width}px`}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className={`card-visual card-visual--${size} card-visual--image`}
      />
    );
  }
  const foil = foilProps(parallelName, serialRun);
  return (
    <span
      className={`card-visual card-visual--${size} card-visual--frame ${foil.className}`}
      style={foil.style}
      role="img"
      aria-label={name}
    >
      <span className="card-visual__number">#{number}</span>
      {isRookie ? <span className="card-visual__rc">RC</span> : null}
      {size !== 'thumb' && player ? (
        <span className="card-visual__name">
          <strong>{player}</strong>
          {setLabel ? <small>{setLabel}</small> : null}
        </span>
      ) : null}
      <span className="card-visual__parallel">{formatParallel(parallelName, serialRun)}</span>
    </span>
  );
}
