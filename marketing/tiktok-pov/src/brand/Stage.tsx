import type React from 'react';
import {H, MIDDLE_THIRD, SAFE_X, W} from './theme';

/**
 * Text area: inside the TikTok-safe side margins, vertically inside the middle third.
 * A plain absolute box: AbsoluteFill forces 100% width and height, which ignores offsets.
 */
export const MiddleThird: React.FC<{children: React.ReactNode; top?: number; bottom?: number; style?: React.CSSProperties}> = ({
  children,
  top = MIDDLE_THIRD.top,
  bottom = MIDDLE_THIRD.bottom,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      top,
      height: bottom - top,
      left: SAFE_X,
      width: W - 2 * SAFE_X,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
      ...style,
    }}
  >
    {children}
  </div>
);

/** An absolute band of the frame, full width, from `top` with a fixed `height`. */
export const Band: React.FC<{top: number; height: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({
  top,
  height,
  children,
  style,
}) => (
  <div style={{position: 'absolute', left: 0, width: W, top, height: Math.min(height, H - top), ...style}}>{children}</div>
);
