import { IMAGE_CREDIT, hasOfficialImages } from '@/lib/images';

/** Required credit under any block that shows an official image. Empty until images exist. */
export function ImageCredit({ className }: { className?: string }) {
  if (!hasOfficialImages()) return null;
  return (
    <p className={`muted small image-credit${className ? ` ${className}` : ''}`}>{IMAGE_CREDIT}</p>
  );
}
