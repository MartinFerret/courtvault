import Image from 'next/image';
import { setImage } from '@/lib/images';

/** Box or key visual of a set when we have it, a typographic tile otherwise. */
export function SetVisual({
  setSlug,
  name,
  season,
  cardCount,
  priority = false,
}: {
  setSlug: string;
  name: string;
  season: string;
  cardCount: number;
  priority?: boolean;
}) {
  const image = setImage(setSlug);
  if (image) {
    const width = 480;
    const height = Math.round((image.height / image.width) * width);
    return (
      <Image
        src={image.src}
        alt={`${season} ${name} basketball cards`}
        width={width}
        height={height}
        sizes="(max-width: 860px) 100vw, 480px"
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className="set-visual set-visual--image"
      />
    );
  }
  return (
    <span className="set-visual set-visual--tile" role="img" aria-label={`${season} ${name}`}>
      <span className="set-visual__count">{cardCount}</span>
      <span className="set-visual__name">{name}</span>
      <span className="set-visual__season">{season}</span>
    </span>
  );
}
