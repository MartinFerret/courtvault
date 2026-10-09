import type React from 'react';
import {AbsoluteFill, Easing, Img, Interactive, interpolate, random, staticFile, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {Arena, Grain} from '../brand/Backdrop';
import {Headline} from '../brand/Headline';
import {MiddleThird} from '../brand/Stage';
import {C, FONT} from '../brand/theme';

const FOILS = [
  'linear-gradient(135deg,#e9eefc,#7c86a8 30%,#f6f8ff 50%,#7c86a8 70%,#e9eefc)',
  'linear-gradient(135deg,#ffe9a3,#c79a2a 35%,#fff3c4 50%,#c79a2a 65%,#ffe9a3)',
  'conic-gradient(from 180deg,#ff4d6d,#ffd166,#3de4a8,#35e6ff,#b48cff,#ff4d6d)',
  'linear-gradient(135deg,#bde3ff,#2f7fd6 35%,#e3f3ff 50%,#2f7fd6 65%,#bde3ff)',
  'linear-gradient(135deg,#e9eefc,#7c86a8 30%,#f6f8ff 50%,#7c86a8 70%,#e9eefc)',
  'linear-gradient(135deg,#ffc2c2,#d9433a 35%,#ffe0e0 50%,#d9433a 65%,#ffc2c2)',
];

/** A messy pile of cards in toploaders, drawn (no player, no Topps artwork). */
const CardPile: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = Array.from({length: 16}, (_, i) => {
    const r = (k: number) => random(`pile-${i}-${k}`);
    return {
      x: 540 + (r(1) - 0.5) * 900,
      y: 980 + (r(2) - 0.5) * 1300,
      rot: (r(3) - 0.5) * 70,
      foil: FOILS[i % FOILS.length]!,
      z: i,
    };
  });
  return (
    <AbsoluteFill
      style={{
        filter: 'blur(9px) brightness(0.42) saturate(1.1)',
        scale: interpolate(frame, [0, 90], [1.12, 1.02], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)}),
      }}
    >
      {cards.map((c) => (
        <div
          key={c.z}
          style={{
            position: 'absolute',
            left: c.x - 170,
            top: c.y - 235,
            width: 340,
            height: 470,
            rotate: `${c.rot}deg`,
            borderRadius: 22,
            padding: 14,
            background: 'rgba(255,255,255,0.18)', // the toploader
            boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.35), 0 30px 60px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{width: '100%', height: '100%', borderRadius: 12, padding: 7, background: c.foil}}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 8,
                background: `linear-gradient(160deg, ${C.surface2}, ${C.inkDeep} 70%)`,
              }}
            />
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** Version B: official Topps refractors as the pile. Use only if the Topps permission covers social media. */
const TOPPS = [
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--red-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--blue-refractor.webp',
  'topps/2025-26-topps-basketball-shai-gilgeous-alexander-card-115.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--green-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--magenta-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--yellow-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--black-refractor.webp',
];

const ToppsPile: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = Array.from({length: 14}, (_, i) => {
    const r = (k: number) => random(`topps-${i}-${k}`);
    return {x: 540 + (r(1) - 0.5) * 980, y: 960 + (r(2) - 0.5) * 1400, rot: (r(3) - 0.5) * 60, src: TOPPS[i % TOPPS.length]!, i};
  });
  return (
    <AbsoluteFill
      style={{
        filter: 'blur(6px) brightness(0.5) saturate(1.2)',
        scale: interpolate(frame, [0, 90], [1.14, 1.02], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)}),
      }}
    >
      {cards.map((c) => (
        <div
          key={c.i}
          style={{
            position: 'absolute',
            left: c.x - 170,
            top: c.y - 238,
            width: 340,
            height: 476,
            rotate: `${c.rot}deg`,
            borderRadius: 20,
            padding: 12,
            background: 'rgba(255,255,255,0.2)',
            boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.4), 0 30px 60px rgba(0,0,0,0.6)',
          }}
        >
          <Img src={staticFile(c.src)} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10}} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

type HookProps = {
  readonly text: string;
  readonly keyword: string;
  readonly topps: boolean;
  readonly photo: string;
  readonly still: boolean;
  readonly style?: React.CSSProperties;
};

const HookSceneInner: React.FC<HookProps> = ({text, keyword, topps, photo, still, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{overflow: 'hidden', ...style}}>
      <Arena>
        {photo ? (
          <Img
            src={staticFile(photo)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(8px) brightness(0.4)',
              scale: interpolate(frame, [0, 90], [1.12, 1.02], {extrapolateRight: 'clamp'}),
            }}
          />
        ) : topps ? (
          <ToppsPile />
        ) : (
          <CardPile />
        )}
        <AbsoluteFill style={{background: 'radial-gradient(70% 45% at 50% 50%, rgba(18,20,23,0.55), rgba(18,20,23,0.15) 70%)'}} />
        {[
          {left: 120, top: 330, rotate: '-8deg', t0: 14},
          {left: 690, top: 420, rotate: '7deg', t0: 22},
          {left: 650, top: 1330, rotate: '-5deg', t0: 30},
          {left: 140, top: 1260, rotate: '6deg', t0: 38},
        ].map((p) => (
          <div
            key={p.t0}
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              rotate: p.rotate,
              padding: '10px 22px',
              borderRadius: 999,
              background: C.lime,
              color: C.ink,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 46,
              boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
              opacity: still ? 1 : interpolate(frame, [p.t0, p.t0 + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              scale: still ? 1 : interpolate(frame, [p.t0, p.t0 + 9], [0.5, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.56, 0.64, 1)}),
            }}
          >
            $???
          </div>
        ))}
        <MiddleThird>
          <Headline text={text} keyword={keyword} size={104} delay={3} stagger={2.4} still={still} />
          {still ? (
            <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 44, color: C.muted, marginTop: 18}}>swipe →</div>
          ) : (
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 500,
                fontSize: 40,
                color: C.muted,
                opacity: interpolate(frame, [1.6 * fps, 2 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              }}
            >
              wait for it…
            </div>
          )}
        </MiddleThird>
      </Arena>
      <Grain />
    </AbsoluteFill>
  );
};

const schema = {
  text: {type: 'text-content', default: "POV: YOU OWN 200 NBA CARDS AND HAVE NO IDEA WHAT THEY'RE WORTH", description: 'Hook'},
  keyword: {type: 'text-content', default: 'NO IDEA', description: 'Highlighted words'},
  topps: {type: 'boolean', default: false, description: 'Official Topps cards (only if the permission covers social media)'},
} as const satisfies InteractivitySchema;

export const HookScene = Interactive.withSchema({Component: HookSceneInner, componentName: '<HookScene>', schema, wrapInSequence: true});
