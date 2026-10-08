/**
 * HoopTicker mark: a basketball drawn in line art with its classic eight-panel seams (vertical
 * seam, two side arcs) and the horizontal seam lifting off into a rising ticker line. Lime
 * strokes by default, meant for the dark header and footer; `tone="mono"` draws it in
 * currentColor for small or printed uses.
 */
export function LogoMark({
  size = 32,
  tone = 'lime',
  className,
}: {
  size?: number;
  tone?: 'lime' | 'mono';
  className?: string;
}) {
  const stroke = tone === 'lime' ? '#e9ff5f' : 'currentColor';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="HoopTicker"
      className={className}
    >
      <g fill="none" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="32" r="27.5" />
        <path d="M32 4.5v55" />
        <path d="M13.5 12.5C25 21 25 43 13.5 51.5" />
        <path d="M50.5 12.5C39 21 39 43 50.5 51.5" />
        <path d="M4.5 32h18l6-8 5 5 13.5-12.5" />
      </g>
    </svg>
  );
}
