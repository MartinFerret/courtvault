import type React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {C} from './theme';

/** Arena background: ink, two soft spotlights from the rafters, a vignette. */
export const Arena: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(70% 38% at 22% 0%, rgba(255,246,222,0.10), transparent 70%),
        radial-gradient(60% 34% at 86% 4%, rgba(227,251,74,0.08), transparent 70%),
        ${C.ink}`,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Film grain and vignette on top of everything: the "shot, not exported" feel. */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, opacity: 0.075, mixBlendMode: 'overlay'}}>
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(random(seed) * 1000)} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
      <AbsoluteFill
        style={{background: 'radial-gradient(120% 85% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)'}}
      />
    </AbsoluteFill>
  );
};
