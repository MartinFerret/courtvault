import Image from 'next/image';
import { cardImage } from '@/lib/images';

/**
 * The visual of one card: the official Topps image when we have it (exact card, exact parallel),
 * nothing otherwise. Explicit size, lazy unless `priority`.
 */
export function CardVisual({
  publicSlug,
  name,
  parallelName = 'Base',
  size = 'medium',
  priority = false,
}: {
  publicSlug: string;
  name: string;
  /** Kept by callers for the alt text and future frames; not drawn. */
  number?: string;
  parallelName?: string;
  serialRun?: number | null;
  isRookie?: boolean;
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
  // No official image for this exact card and parallel: nothing is drawn, no placeholder.
  return null;
}
