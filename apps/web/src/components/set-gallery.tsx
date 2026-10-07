import Image from 'next/image';
import { setGallery } from '@/lib/images';
import { ImageCredit } from './image-credit';

/** Inserts and autographs of a set, as Topps shows them. Labelled, never confused with catalog cards. */
export function SetGallery({ setSlug, setName }: { setSlug: string; setName: string }) {
  const items = setGallery(setSlug);
  if (items.length === 0) return null;
  return (
    <section className="gallery">
      <h2>From the set</h2>
      <p className="muted small">
        Inserts and autographs of {setName}, outside the base checklist above.
      </p>
      <ul className="gallery__list">
        {items.map((g) => {
          const width = 220;
          const height = Math.round((g.height / g.width) * width);
          return (
            <li key={g.name}>
              <Image
                src={g.src}
                alt={`${g.caption}, ${setName}`}
                width={width}
                height={height}
                sizes="220px"
                loading="lazy"
                className="gallery__img"
              />
              <span className="muted small">{g.caption}</span>
            </li>
          );
        })}
      </ul>
      <ImageCredit />
    </section>
  );
}
