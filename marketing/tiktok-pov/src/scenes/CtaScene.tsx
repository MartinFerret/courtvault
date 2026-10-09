import type React from 'react';
import {AbsoluteFill, Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {Arena, Grain} from '../brand/Backdrop';
import {BallMark, LogoLockup} from '../brand/Logo';
import {TickerBand} from '../brand/TickerBand';
import {Band} from '../brand/Stage';
import {C, FONT, SAFE_BOTTOM, SAFE_TOP} from '../brand/theme';

const FAN = [
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--black-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--blue-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--green-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--yellow-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--magenta-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--red-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221.webp',
];

/** Version B: the refractor rainbow fanning open behind the brand. */
const CardFan: React.FC<{f: number}> = ({f}) => (
  <div style={{position: 'absolute', left: 540, top: 1560, width: 0, height: 0, filter: 'brightness(0.42) blur(1.5px) saturate(1.25)'}}>
    {FAN.map((src, i) => {
      const spread = (i - (FAN.length - 1) / 2) * 13;
      const open = interpolate(f, [10 + i, 26 + i], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
      return (
        <Img
          key={src}
          src={staticFile(src)}
          style={{
            position: 'absolute',
            left: -160,
            top: -1180,
            width: 320,
            height: 448,
            borderRadius: 18,
            objectFit: 'cover',
            transformOrigin: '160px 1180px',
            rotate: `${spread * 1.25 * open}deg`,
            opacity: 0.5 + 0.5 * open,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            filter: 'saturate(1.2)',
          }}
        />
      );
    })}
  </div>
);

type Props = {
  readonly topps: boolean;
  readonly brand: string;
  readonly tagline: string;
  readonly keyword: string;
  readonly still: boolean;
  readonly style?: React.CSSProperties;
};

/** Brand moment: the mark, HOOPTICKER very large, FREE in lime, the tape crossing, an arrow to the bio. */
const CtaSceneInner: React.FC<Props> = ({topps, brand, tagline, keyword, still, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = still ? 10_000 : frame;
  const pop = (t0: number) =>
    interpolate(f, [t0, t0 + 12], [0.6, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
  const fade = (t0: number) => interpolate(f, [t0, t0 + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const [before, after] = tagline.toUpperCase().split(keyword.toUpperCase());
  return (
    <AbsoluteFill style={{overflow: 'hidden', ...style}}>
      <Arena>
        <Band top={SAFE_TOP} height={60} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <LogoLockup style={{opacity: 0.92}} />
        </Band>
        {topps ? (
          <>
            <CardFan f={f} />
            <AbsoluteFill style={{background: 'radial-gradient(60% 30% at 50% 36%, rgba(18,20,23,0.75), transparent 75%)'}} />
          </>
        ) : null}
        <TickerBand speed={9} style={{top: 1095, rotate: '-7deg', opacity: 0.95}} />
        <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 430}}>
          <div style={{scale: pop(2), opacity: fade(2), filter: 'drop-shadow(0 0 40px rgba(227,251,74,0.4))'}}>
            <BallMark size={190} />
          </div>
          <div
            style={{
              marginTop: 36,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 142,
              letterSpacing: '-0.035em',
              lineHeight: 1,
              color: C.text,
              scale: pop(8),
              opacity: fade(8),
            }}
          >
            {brand.toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 30,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 64,
              letterSpacing: '0.02em',
              color: C.text,
              opacity: fade(16),
              translate: interpolate(f, [16, 26], ['0px 30px', '0px 0px'], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)}),
            }}
          >
            {before}
            <span style={{color: C.lime, textShadow: '0 0 30px rgba(227,251,74,0.4)'}}>{keyword.toUpperCase()}</span>
            {after}
          </div>
        </AbsoluteFill>
        <Band top={1200} height={SAFE_BOTTOM - 1200} style={{display: 'grid', placeItems: 'center'}}>
          <svg
            width="110"
            height="150"
            viewBox="0 0 110 150"
            style={{
              opacity: fade(24),
              translate: `0px ${still ? 0 : Math.sin((frame / fps) * Math.PI * 2.2) * 14}px`,
            }}
          >
            <path d="M55 8 V128 M14 88 L55 130 L96 88" fill="none" stroke={C.lime} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Band>
      </Arena>
      <Grain />
    </AbsoluteFill>
  );
};

const schema = {
  topps: {type: 'boolean', default: false, description: 'Official Topps fan (only if the permission covers social media)'},
  brand: {type: 'text-content', default: 'HoopTicker', description: 'Brand'},
  tagline: {type: 'text-content', default: 'FREE · LINK IN BIO', description: 'Tagline'},
  keyword: {type: 'text-content', default: 'FREE', description: 'Highlighted word'},
} as const satisfies InteractivitySchema;

export const CtaScene = Interactive.withSchema({Component: CtaSceneInner, componentName: '<CtaScene>', schema, wrapInSequence: true});
