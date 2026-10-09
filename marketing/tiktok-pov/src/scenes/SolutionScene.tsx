import type React from 'react';
import {AbsoluteFill, Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame, type InteractivitySchema} from 'remotion';
import {Arena, Grain} from '../brand/Backdrop';
import {Headline} from '../brand/Headline';
import {LogoLockup} from '../brand/Logo';
import {Band, MiddleThird} from '../brand/Stage';
import {TickerBand, money} from '../brand/TickerBand';
import market from '../data/market.json';
import {C, FONT, LED, SAFE_BOTTOM, SAFE_TOP} from '../brand/theme';

/** The real "Last night" screen in a phone, tilted, rising out of the ticker band. */
const Phone: React.FC<{screens: string[]; still: boolean}> = ({screens, still}) => {
  const frame = useCurrentFrame();
  const f = still ? 10_000 : frame;
  // One screen per 26 frames after the phone lands; each new one slides up like a scroll.
  const per = 26;
  const t = Math.max(0, frame - 24);
  const idx = still ? 0 : Math.min(screens.length - 1, Math.floor(t / per));
  const inT = still ? per : t - idx * per;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: SAFE_BOTTOM, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 880,
          width: 640,
          height: 1340,
          marginLeft: -320,
          borderRadius: 78,
          padding: 16,
          background: 'linear-gradient(160deg, #2b2f36, #0d0e10)',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 60px 120px rgba(0,0,0,0.7), 0 0 120px rgba(227,251,74,0.12)',
          rotate: '-6deg',
          translate: interpolate(f, [4, 22], ['0px 520px', '0px 0px'], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div style={{width: '100%', height: '100%', borderRadius: 64, overflow: 'hidden', background: '#e4e7ea', position: 'relative'}}>
          {screens.map((src, i) =>
            i === idx || i === idx - 1 ? (
              <Img
                key={src}
                src={staticFile(src)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  display: 'block',
                  translate:
                    i === idx && idx > 0
                      ? interpolate(inT, [0, 8], ['0px 900px', '0px 0px'], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)})
                      : '0px 0px',
                  zIndex: i === idx ? 2 : 1,
                }}
              />
            ) : null,
          )}
          <div style={{position: 'absolute', top: 16, left: '50%', width: 150, height: 40, marginLeft: -75, borderRadius: 20, background: '#0d0e10'}} />
        </div>
      </div>
    </div>
  );
};

type Mover = {label: string; cents: number; changePct: number | null; prevCents: number | null};

/** Real price tags popping around the phone: the night's moves, or real values when nothing moved. */
const PriceTags: React.FC<{still: boolean}> = ({still}) => {
  const frame = useCurrentFrame();
  const f = still ? 10_000 : frame;
  const movers = (market.movers as Mover[]).slice(0, 3);
  const tags = movers.length >= 2 ? movers : (market.tape as Mover[]).slice(0, 3);
  const spots = [
    {left: 18, top: 935, rotate: '-4deg'},
    {left: 732, top: 1040, rotate: '4deg'},
    {left: 24, top: 1175, rotate: '3deg'},
  ];
  return (
    <>
      {(market as {example?: boolean}).example ? (
        <div style={{position: 'absolute', left: 0, width: 1080, top: 1295, textAlign: 'center', fontFamily: FONT, fontSize: 22, color: C.faint, zIndex: 6, opacity: interpolate(f, [40, 46], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          Example values
        </div>
      ) : null}
      {tags.map((t, i) => {
        const t0 = 30 + i * 9;
        const up = (t.changePct ?? 0) >= 0;
        return (
          <div
            key={t.label}
            style={{
              position: 'absolute',
              ...spots[i],
              width: 330,
              padding: '14px 18px',
              borderRadius: 22,
              background: 'rgba(29,32,37,0.92)',
              boxShadow: `0 20px 50px rgba(0,0,0,0.55), inset 0 0 0 2px ${t.changePct === null ? 'rgba(255,255,255,0.08)' : up ? 'rgba(95,224,143,0.55)' : 'rgba(255,91,79,0.55)'}`,
              fontFamily: FONT,
              color: C.text,
              zIndex: 5,
              opacity: interpolate(f, [t0, t0 + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              scale: interpolate(f, [t0, t0 + 10], [0.7, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.56, 0.64, 1)}),
            }}
          >
            <div style={{fontSize: 22, fontWeight: 600, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{t.label}</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4}}>
              <span style={{fontFamily: LED, fontSize: 52, fontWeight: 600, lineHeight: 1}}>{money(t.cents)}</span>
              {t.changePct !== null && t.changePct !== 0 ? (
                <span style={{fontSize: 30, fontWeight: 700, color: up ? C.gain : C.loss}}>
                  {up ? '▲' : '▼'} {Math.abs(t.changePct).toFixed(1)}%
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
};

type Props = {
  readonly text: string;
  readonly keyword: string;
  readonly screens: string[];
  readonly still: boolean;
  readonly style?: React.CSSProperties;
};

const SolutionSceneInner: React.FC<Props> = ({text, keyword, screens, still, style}) => (
  <AbsoluteFill style={{overflow: 'hidden', ...style}}>
    <Arena>
      <Band top={SAFE_TOP} height={60} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <LogoLockup style={{opacity: 0.92}} />
      </Band>
      <Phone screens={screens} still={still} />
      <PriceTags still={still} />
      <MiddleThird top={500} bottom={860}>
        <Headline text={text} keyword={keyword} size={84} delay={2} still={still} />
      </MiddleThird>
      <TickerBand style={{top: SAFE_BOTTOM - 116, rotate: '-2deg'}} />
      <Band top={SAFE_BOTTOM} height={480} style={{background: C.ink}} />
    </Arena>
    <Grain />
  </AbsoluteFill>
);

const schema = {
  text: {type: 'text-content', default: 'NOW, EVERY MORNING: WHAT LAST NIGHT DID TO YOUR CARDS', description: 'Text'},
  keyword: {type: 'text-content', default: 'EVERY MORNING', description: 'Highlighted words'},
} as const satisfies InteractivitySchema;

export const SolutionScene = Interactive.withSchema({Component: SolutionSceneInner, componentName: '<SolutionScene>', schema, wrapInSequence: true});
