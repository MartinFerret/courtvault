import type React from 'react';
import {C, FONT} from './theme';

/** The HoopTicker mark: a basketball whose horizontal seam rises like a ticker line. */
export const BallMark: React.FC<{size: number; stroke?: string}> = ({size, stroke = C.lime}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
    <g fill="none" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="27.5" />
      <path d="M32 4.5v55" />
      <path d="M13.5 12.5C25 21 25 43 13.5 51.5" />
      <path d="M50.5 12.5C39 21 39 43 50.5 51.5" />
      <path d="M4.5 32h18l6-8 5 5 13.5-12.5" />
    </g>
  </svg>
);

/** Small, discreet brand lockup for the top of the frame. */
export const LogoLockup: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 38,
      letterSpacing: '-0.02em',
      color: C.text,
      ...style,
    }}
  >
    <BallMark size={46} />
    <span>HoopTicker</span>
  </div>
);
