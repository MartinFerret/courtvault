/**
 * HoopTicker mark: a basketball whose horizontal seam is a rising ticker line. Ink seams on a
 * lime ball by default; `tone="ink"` draws a lime ball with ink seams on dark surfaces too
 * (same drawing), `tone="mono"` is a single-colour version for small or printed uses.
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
  const ball = tone === 'lime' ? '#e9ff5f' : 'currentColor';
  const seam = tone === 'lime' ? '#121417' : 'var(--cv-bg, #edeff1)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="HoopTicker"
      className={className}
    >
      <circle cx="32" cy="32" r="29" fill={ball} />
      <g fill="none" stroke={seam} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 19.5C19 24 19 40 6.5 44.5" />
        <path d="M57.5 19.5C45 24 45 40 57.5 44.5" />
        <path d="M4.5 38.5h11l7-9.5 8 14 9.5-19.5 7 8.5 11.5-14" />
      </g>
    </svg>
  );
}
