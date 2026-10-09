import type React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Arena, Grain} from '../brand/Backdrop';
import {LogoLockup} from '../brand/Logo';
import {money} from '../brand/TickerBand';
import {C, FONT, LED} from '../brand/theme';

/**
 * Photo post "One game": the same rookie card before tip-off and the next morning.
 * Figures are props and illustrative by default; use a real night's move before posting.
 */
export type OneGameProps = {beforeCents: number; afterCents: number; points: number; rebounds: number; assists: number};

const Tag: React.FC<{when: string; cents: number; pct?: number; style: React.CSSProperties; hot?: boolean}> = ({when, cents, pct, style, hot}) => (
  <div
    style={{
      position: 'absolute',
      padding: '22px 30px 24px',
      borderRadius: 30,
      background: hot ? C.lime : 'rgba(29,32,37,0.92)',
      color: hot ? C.ink : C.text,
      fontFamily: FONT,
      boxShadow: hot ? '0 0 80px rgba(227,251,74,0.45), 0 30px 60px rgba(0,0,0,0.5)' : '0 30px 60px rgba(0,0,0,0.5)',
      ...style,
    }}
  >
    <div style={{fontSize: 30, fontWeight: 600, opacity: hot ? 0.75 : 0.7}}>{when}</div>
    <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 4}}>
      <span style={{fontSize: hot ? 92 : 70, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1}}>{money(cents)}</span>
      {pct !== undefined ? (
        <span style={{padding: '8px 16px', borderRadius: 999, background: C.ink, color: C.gain, fontSize: 38, fontWeight: 800}}>▲ {pct.toFixed(1)}%</span>
      ) : null}
    </div>
  </div>
);

export const OneGame: React.FC<OneGameProps> = ({beforeCents, afterCents, points, rebounds, assists}) => {
  const pct = ((afterCents - beforeCents) / beforeCents) * 100;
  return (
    <Arena>
      {/* Faded lime watermark, the brand device behind hero areas. */}
      <AbsoluteFill style={{display: 'grid', placeItems: 'center', fontFamily: LED, fontSize: 400, color: C.lime, opacity: 0.07, top: -40}}>
        +{Math.round(pct)}%
      </AbsoluteFill>
      <LogoLockup style={{position: 'absolute', top: 262, left: 0, right: 0, justifyContent: 'center'}} />
      <div style={{position: 'absolute', top: 350, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 800, color: C.text, fontSize: 150, letterSpacing: '-0.045em', lineHeight: 0.95}}>
        One game.
      </div>
      {/* Spotlight cone on the card. */}
      <div style={{position: 'absolute', left: 140, top: 480, width: 800, height: 760, background: 'radial-gradient(50% 50% at 50% 50%, rgba(227,251,74,0.16), transparent 70%)'}} />
      <div style={{position: 'absolute', left: 345, top: 560, width: 390, height: 545, rotate: '-7deg', borderRadius: 26, padding: 14, background: 'conic-gradient(from 210deg,#ff4d6d,#ffd166,#3de4a8,#35e6ff,#b48cff,#ff4d6d)', boxShadow: '0 50px 120px rgba(0,0,0,0.7), 0 0 90px rgba(227,251,74,0.18)', overflow: 'hidden'}}>
        <div style={{width: '100%', height: '100%', borderRadius: 16, background: 'linear-gradient(160deg,#2b3038,#0b0c0e 75%)', position: 'relative', overflow: 'hidden'}}>
          <Img src={staticFile('art-dunk.svg')} style={{position: 'absolute', left: 40, top: 110, width: 280, filter: 'invert(1) brightness(0.9)'}} />
          <div style={{position: 'absolute', right: 24, top: 22, textAlign: 'right', fontFamily: FONT, lineHeight: 1.05}}>
            <div style={{fontWeight: 800, fontSize: 34, color: '#fff'}}>ROOKIE</div>
            <div style={{fontWeight: 700, fontSize: 24, color: C.lime}}>REFRACTOR</div>
          </div>
        </div>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.5) 50%, transparent 62%)'}} />
      </div>
      <Tag when="6:58 PM, before tip-off" cents={beforeCents} style={{left: 48, top: 560, rotate: '-4deg'}} />
      <Tag when="8:00 AM, next morning" cents={afterCents} pct={pct} hot style={{right: 44, top: 965, rotate: '3deg'}} />
      {/* Box score strip: what happened in between. */}
      <div style={{position: 'absolute', top: 1196, left: 120, right: 120, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 36px', borderRadius: 999, background: '#000', boxShadow: 'inset 0 0 0 3px #2a2e35'}}>
        <span style={{fontFamily: FONT, fontSize: 30, fontWeight: 600, color: C.muted}}>Last night</span>
        <span style={{fontFamily: LED, fontSize: 64, color: C.amber, letterSpacing: '0.03em', textShadow: '0 0 24px rgba(255,178,62,0.55)'}}>
          {points} PTS&nbsp;&nbsp;{rebounds} REB&nbsp;&nbsp;{assists} AST
        </span>
      </div>
      <div style={{position: 'absolute', top: 1318, left: 120, right: 120, textAlign: 'center', fontFamily: FONT, fontSize: 40, fontWeight: 500, color: C.text, lineHeight: 1.25}}>
        HoopTicker shows you every morning what last night did to your cards.
      </div>
      <Grain />
    </Arena>
  );
};
