import type React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, random, useCurrentFrame, type InteractivitySchema} from 'remotion';
import {Arena, Grain} from '../brand/Backdrop';
import {Headline} from '../brand/Headline';
import {MiddleThird} from '../brand/Stage';
import {C, FONT} from '../brand/theme';

const COLS = ['A', 'B', 'C', 'D', 'E'];

/** An old spreadsheet, blurred, crossed out by a big X drawn stroke by stroke. */
const Sheet: React.FC<{still: boolean}> = ({still}) => {
  const frame = useCurrentFrame();
  const f = still ? 10_000 : frame;
  const draw = (t0: number) =>
    interpolate(f, [t0, t0 + 9], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.65, 0, 0.35, 1)});
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 250, height: 560, rotate: '2deg'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 24,
          background: '#ffffff',
          overflow: 'hidden',
          filter: 'blur(3px)',
          opacity: 0.6,
          boxShadow: '0 40px 90px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{height: 64, background: '#1f7a45', display: 'flex', alignItems: 'center', padding: '0 24px', fontFamily: FONT, fontSize: 28, color: '#fff', fontWeight: 600}}>
          my_cards_2023.xlsx
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)'}}>
          <div style={{height: 46, background: '#eef0f2'}} />
          {COLS.map((c) => (
            <div key={c} style={{height: 46, background: '#eef0f2', borderLeft: '1px solid #d0d4d8', fontFamily: FONT, fontSize: 22, color: '#5f6368', display: 'grid', placeItems: 'center'}}>
              {c}
            </div>
          ))}
          {Array.from({length: 9}, (_, r) => (
            <div key={r} style={{display: 'contents'}}>
              <div style={{height: 48, background: '#eef0f2', borderTop: '1px solid #d0d4d8', fontFamily: FONT, fontSize: 20, color: '#5f6368', display: 'grid', placeItems: 'center'}}>
                {r + 1}
              </div>
              {COLS.map((c, ci) => (
                <div key={c} style={{height: 48, borderTop: '1px solid #e1e4e7', borderLeft: '1px solid #e1e4e7', fontFamily: FONT, fontSize: 22, color: '#202124', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: ci > 2 ? 'flex-end' : 'flex-start'}}>
                  {ci > 2 ? `$${(random(`s${r}${ci}`) * 240 + 4).toFixed(2)}` : ''}
                  {ci <= 2 ? <span style={{height: 14, width: `${50 + random(`w${r}${ci}`) * 45}%`, borderRadius: 4, background: '#cfd3d7'}} /> : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* The cross: two red bars that stretch across the sheet, one after the other. */}
      {[
        {t0: 8, rotate: 'atan'},
        {t0: 15, rotate: 'neg'},
      ].map(({t0, rotate}) => {
        const w = 940;
        const h = 560;
        const len = Math.hypot(w, h) + 60; // a little past each corner
        const angle = (Math.atan2(h, w) * 180) / Math.PI;
        return (
          <div
            key={t0}
            style={{
              position: 'absolute',
              left: -30 * Math.cos((angle * Math.PI) / 180),
              top: (rotate === 'atan' ? 0 : h) - 16,
              width: len,
              height: 32,
              borderRadius: 16,
              background: C.loss,
              boxShadow: '0 0 30px rgba(255,91,79,0.5)',
              rotate: `${rotate === 'atan' ? angle : -angle}deg`,
              scale: `${1 - draw(t0)} 1`,
              transformOrigin: '0px 16px',
            }}
          />
        );
      })}
    </div>
  );
};

type Props = {readonly text: string; readonly keyword: string; readonly still: boolean; readonly style?: React.CSSProperties};

const SheetSceneInner: React.FC<Props> = ({text, keyword, still, style}) => (
  <AbsoluteFill style={{overflow: 'hidden', ...style}}>
    <Arena>
      <Sheet still={still} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, transparent 30%, ${C.ink} 46%)`}} />
      <MiddleThird top={900} bottom={1300}>
        <Headline text={text} keyword={keyword} size={86} delay={4} still={still} />
      </MiddleThird>
    </Arena>
    <Grain />
  </AbsoluteFill>
);

const schema = {
  text: {type: 'text-content', default: 'YOUR SPREADSHEET IS FROM 2023. HALF THE PRICES ARE WRONG', description: 'Text'},
  keyword: {type: 'text-content', default: 'HALF THE PRICES ARE WRONG', description: 'Highlighted words'},
} as const satisfies InteractivitySchema;

export const SheetScene = Interactive.withSchema({Component: SheetSceneInner, componentName: '<SheetScene>', schema, wrapInSequence: true});
