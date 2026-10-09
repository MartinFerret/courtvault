import type React from 'react';
import {useCurrentFrame} from 'remotion';
import market from '../data/market.json';
import {C, FONT} from './theme';

type Item = {label: string; cents: number; changePct: number | null};

const BRAND: [string, '▲' | '▼' | ''][] = [
  ['HOOPTICKER', '▲'],
  ['LAST NIGHT', '▲'],
  ['BOX SCORES', '▲'],
  ['CARD VALUES', '▼'],
  ['YOUR VAULT', '▲'],
];

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: cents >= 100_000 ? 0 : 2, maximumFractionDigits: cents >= 100_000 ? 0 : 2})}`;

/**
 * The lime market tape: real HoopTicker card values (src/data/market.json, pulled from the
 * cloud by tools/market.mjs) with their real change since the previous value. Brand words fill
 * in when no data is available. Nothing is invented.
 */
export const TickerBand: React.FC<{speed?: number; style?: React.CSSProperties}> = ({speed = 7, style}) => {
  const frame = useCurrentFrame();
  const tape = (market.tape as Item[]).slice(0, 10);
  const items = tape.length > 0 ? [...tape, ...tape, ...tape] : null;
  return (
    <div
      style={{
        position: 'absolute',
        left: -200,
        right: -200,
        height: 96,
        background: C.lime,
        color: C.ink,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 52,
          whiteSpace: 'nowrap',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 38,
          letterSpacing: '0.005em',
          translate: `${-frame * speed}px 0px`,
        }}
      >
        {items
          ? items.map((t, i) => (
              <span key={i} style={{display: 'inline-flex', alignItems: 'center', gap: 14}}>
                <span>{t.label}</span>
                <span style={{fontWeight: 700}}>{money(t.cents)}</span>
                {t.changePct !== null && t.changePct !== 0 ? (
                  <span style={{display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, background: C.ink, color: t.changePct > 0 ? C.gain : C.loss, fontSize: 32}}>
                    {t.changePct > 0 ? '▲' : '▼'} {Math.abs(t.changePct).toFixed(1)}%
                  </span>
                ) : null}
              </span>
            ))
          : [...BRAND, ...BRAND, ...BRAND, ...BRAND].map(([w, arrow], i) => (
              <span key={i} style={{display: 'inline-flex', alignItems: 'center', gap: 14}}>
                {w}
                {arrow ? <span style={{fontSize: 30, opacity: 0.85}}>{arrow}</span> : null}
              </span>
            ))}
      </div>
    </div>
  );
};

export {money};
