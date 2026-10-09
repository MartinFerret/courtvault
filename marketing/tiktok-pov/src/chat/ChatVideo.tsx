import type React from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Grain} from '../brand/Backdrop';
import {BallMark} from '../brand/Logo';
import {TickerBand, money} from '../brand/TickerBand';
import {C, FONT, LED} from '../brand/theme';

/**
 * "The fake conversation": Jake (right, blue, the phone's owner) texts Marcus (left, grey)
 * about his rookie card, sends a HoopTicker screenshot, Marcus loses it. 21 s at 30 fps.
 * Figures are props: put last night's real stat line and the card's real move before posting.
 */
export type ChatProps = {points: number; rebounds: number; assists: number; pct: number; priceCents: number};

const CHAT = {
  bg: '#0f1114',
  blue: '#2b7bff',
  grey: '#26292f',
  meta: '#8b929c',
  appCanvas: '#f2f4f6',
  appInk: '#121417',
  appMuted: '#5f6670',
  appGain: '#1f9d55',
} as const;

/** Shared motion tokens. */
const POP = {damping: 13, stiffness: 240, mass: 0.6};
const GROW = 6; // frames for the thread to make room for a new bubble

type Msg =
  | {at: number; from: 'jake' | 'marcus'; text: React.ReactNode; sfx: 'notify' | 'pop' | 'whoosh' | 'send'}
  | {at: number; from: 'jake'; shot: true; sfx: 'send'};

const Emoji: React.FC<{name: 'eyes' | 'skull'}> = ({name}) => (
  <Img src={staticFile(`emoji/${name}.png`)} style={{width: 58, height: 58, verticalAlign: '-11px', marginLeft: 6}} />
);

// Beats (frame = seconds x 30). Each bubble lands when the previous one has been read.
const T = {typing: 135, wait: 390, shot: 300, pctIn: 334, end: 585};

const messages = (p: ChatProps): Msg[] => [
  {at: 0, from: 'jake', text: 'bro you still holding that Flagg Chrome rookie?', sfx: 'notify'},
  {at: 45, from: 'marcus', text: 'ya why', sfx: 'pop'},
  {at: 90, from: 'jake', text: <>he dropped <b style={{color: C.lime, fontSize: 62, fontWeight: 800}}>{p.points}</b> last night</>, sfx: 'send'},
  {at: 158, from: 'marcus', text: 'ok and??', sfx: 'pop'},
  {at: 190, from: 'jake', text: <>check what it did to your card<Emoji name="eyes" /></>, sfx: 'send'},
  {at: 240, from: 'marcus', text: 'how am I supposed to know that', sfx: 'pop'},
  {at: T.shot, from: 'jake', shot: true, sfx: 'send'},
  {at: T.wait, from: 'marcus', text: 'WAIT what is this', sfx: 'whoosh'},
  {at: 450, from: 'jake', text: <><b style={{fontWeight: 800}}>HoopTicker.</b> tells you every morning what last night did to your cards</>, sfx: 'send'},
  {at: 535, from: 'marcus', text: <>bro I've been checking eBay for 2 years<Emoji name="skull" /></>, sfx: 'pop'},
];

/** The HoopTicker card screen Jake screenshots (drawn, light app theme, generic foil frame). */
const SHOT_W = 640;
const SHOT_H = 860;
const Screenshot: React.FC<{p: ChatProps; t: number}> = ({p, t}) => {
  const prev = Math.round(p.priceCents / (1 + p.pct / 100));
  const count = interpolate(t, [12, T.pctIn - T.shot], [prev, p.priceCents], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const chipT = t - (T.pctIn - T.shot);
  const chip = spring({frame: chipT, fps: 30, config: {damping: 9, stiffness: 260, mass: 0.6}});
  const draw = interpolate(t, [8, T.pctIn - T.shot], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const glow = chipT > 0 ? 0.5 + 0.5 * Math.sin(chipT / 5) : 0;
  const pts = [0, 4, 2, 6, 5, 8, 7, 9, 8, 11, 10, 34];
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * 556} ${150 - v * 4}`).join(' ');
  const shimmer = interpolate(t, [0, 90], [-120, 220]);
  return (
    <div style={{width: SHOT_W, height: SHOT_H, borderRadius: 40, overflow: 'hidden', background: CHAT.appCanvas, fontFamily: FONT, color: CHAT.appInk, position: 'relative'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '30px 34px 0', fontSize: 30, fontWeight: 700}}>
        <div style={{width: 46, height: 46, borderRadius: 999, background: CHAT.appInk, display: 'grid', placeItems: 'center'}}>
          <BallMark size={30} />
        </div>
        HoopTicker
      </div>
      <div style={{display: 'flex', gap: 28, padding: '28px 34px 0'}}>
        <div style={{width: 210, height: 292, borderRadius: 18, padding: 9, background: 'conic-gradient(from 200deg,#ff4d6d,#ffd166,#3de4a8,#35e6ff,#b48cff,#ff4d6d)', position: 'relative', overflow: 'hidden', flexShrink: 0}}>
          <div style={{width: '100%', height: '100%', borderRadius: 11, background: `linear-gradient(160deg, #2b3038, #0b0c0e 75%)`, position: 'relative', overflow: 'hidden'}}>
            <Img src={staticFile('art-dunk.svg')} style={{position: 'absolute', left: 14, top: 22, width: 164, opacity: 0.9, filter: 'invert(1) brightness(0.85)'}} />
            <div style={{position: 'absolute', bottom: 14, left: 14, fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.04em'}}>FLAGG RC</div>
          </div>
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)', translate: `${shimmer}% 0`}} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6}}>
          <div style={{fontSize: 38, fontWeight: 800, lineHeight: 1.05}}>Cooper Flagg</div>
          <div style={{fontSize: 25, color: CHAT.appMuted}}>2025-26 Topps Chrome</div>
          <div style={{fontSize: 25, color: CHAT.appMuted}}>#251 Refractor</div>
          <div style={{marginTop: 8, alignSelf: 'flex-start', padding: '6px 16px', borderRadius: 999, background: C.lime, fontSize: 22, fontWeight: 800}}>Rookie</div>
        </div>
      </div>
      <div style={{padding: '30px 34px 0', display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{fontSize: 96, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1}}>{money(Math.round(count))}</div>
        <div
          style={{
            padding: '10px 20px',
            borderRadius: 999,
            background: CHAT.appGain,
            color: '#fff',
            fontSize: 42,
            fontWeight: 800,
            scale: String(chipT < 0 ? 0 : 0.6 + 0.4 * chip),
            boxShadow: `0 0 ${20 + glow * 40}px rgba(31,157,85,${0.35 + glow * 0.35})`,
          }}
        >
          ▲ {p.pct.toFixed(1)}%
        </div>
      </div>
      <div style={{padding: '6px 34px 0', fontSize: 25, color: CHAT.appMuted}}>since last night</div>
      <svg width={556} height={170} style={{margin: '18px 42px 0', overflow: 'visible'}}>
        <path d={path} fill="none" stroke={CHAT.appGain} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        {draw >= 1 ? <circle cx={556} cy={150 - 34 * 4} r={12 + glow * 6} fill={CHAT.appGain} /> : null}
      </svg>
      <div style={{margin: '8px 34px 0', padding: '18px 24px', borderRadius: 26, background: '#e3e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span style={{fontSize: 25, fontWeight: 700}}>Last night</span>
        <span style={{fontFamily: LED, fontSize: 44, letterSpacing: '0.02em'}}>
          {p.points} PTS&nbsp;&nbsp;{p.rebounds} REB&nbsp;&nbsp;{p.assists} AST
        </span>
      </div>
    </div>
  );
};

const TypingDots: React.FC<{t: number}> = ({t}) => (
  <div style={{display: 'flex', gap: 12, padding: '34px 36px', background: CHAT.grey, borderRadius: '44px 44px 44px 14px', alignSelf: 'flex-start', scale: String(0.9 + 0.1 * Math.min(1, t / 4))}}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{width: 20, height: 20, borderRadius: 99, background: CHAT.meta, opacity: 0.4 + 0.6 * Math.max(0, Math.sin((t - i * 4) / 4))}} />
    ))}
  </div>
);

const Bubble: React.FC<{m: Msg; f: number; prevFrom?: string; first: boolean; p: ChatProps}> = ({m, f, prevFrom, first, p}) => {
  const {fps} = useVideoConfig();
  const t = f - m.at;
  const room = first ? 1 : interpolate(t, [0, GROW], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const s = spring({frame: t, fps, config: POP});
  const mine = m.from === 'jake';
  return (
    <div style={{display: 'grid', gridTemplateRows: `${room}fr`, marginTop: room * (prevFrom === m.from ? 14 : 34)}}>
      <div style={{minHeight: 0, display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start'}}>
        <div style={{scale: String(0.9 + 0.1 * s), transformOrigin: mine ? '100% 100%' : '0% 100%'}}>
          {'shot' in m ? (
            <div style={{padding: 6, borderRadius: 46, background: CHAT.blue}}>
              <Screenshot p={p} t={t} />
            </div>
          ) : (
            <div
              style={{
                maxWidth: 820,
                padding: '24px 36px 26px',
                borderRadius: mine ? '44px 44px 14px 44px' : '44px 44px 44px 14px',
                background: mine ? CHAT.blue : CHAT.grey,
                color: '#fff',
                fontFamily: FONT,
                fontSize: 52,
                fontWeight: 500,
                lineHeight: 1.22,
                letterSpacing: '-0.005em',
              }}
            >
              {m.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Header: React.FC = () => (
  <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 410, background: `linear-gradient(${CHAT.bg} 80%, rgba(15,17,20,0))`, zIndex: 5, fontFamily: FONT, color: C.text}}>
    <div style={{position: 'absolute', top: 54, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', fontSize: 34, fontWeight: 600}}>
      <span>8:14</span>
      <span style={{display: 'flex', gap: 8, alignItems: 'flex-end'}}>
        {[14, 20, 26, 32].map((h) => (
          <span key={h} style={{width: 8, height: h, borderRadius: 3, background: C.text}} />
        ))}
        <span style={{marginLeft: 14, width: 58, height: 28, borderRadius: 8, border: `3px solid ${C.text}`, padding: 3}}>
          <span style={{display: 'block', width: '78%', height: '100%', borderRadius: 4, background: C.text}} />
        </span>
      </span>
    </div>
    <div style={{position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
      <div style={{width: 104, height: 104, borderRadius: 999, background: 'linear-gradient(140deg,#7d8794,#3d434c)', display: 'grid', placeItems: 'center', fontSize: 50, fontWeight: 700}}>M</div>
      <div style={{fontSize: 30, fontWeight: 600}}>Marcus</div>
    </div>
    <div style={{position: 'absolute', top: 186, left: 56, fontSize: 64, color: CHAT.blue, fontWeight: 300}}>‹</div>
  </div>
);

const Composer: React.FC = () => (
  <div style={{position: 'absolute', top: 1470, left: 40, right: 40, height: 96, borderRadius: 999, border: '2px solid #2c3036', display: 'flex', alignItems: 'center', padding: '0 34px', fontFamily: FONT, fontSize: 34, color: CHAT.meta}}>
    Message
  </div>
);

/** Faded lime watermark behind the thread (brand device): the number of the moment. */
const Watermark: React.FC<{f: number; p: ChatProps}> = ({f, p}) => {
  if (f < 90) return null;
  const shot = f >= T.pctIn;
  const at = shot ? T.pctIn : 90;
  const s = spring({frame: f - at, fps: 30, config: {damping: 16, stiffness: 120}});
  return (
    <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: LED, fontSize: shot ? 560 : 900, color: C.lime, opacity: 0.07 * s, scale: String(1.25 - 0.25 * s), letterSpacing: '-0.02em'}}>
      {shot ? `+${Math.round(p.pct)}%` : p.points}
    </div>
  );
};

const EndCard: React.FC<{t: number}> = ({t}) => {
  const s = spring({frame: t, fps: 30, config: {damping: 10, stiffness: 200, mass: 0.7}});
  const url = interpolate(t, [10, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: FONT, color: C.text}}>
      <div style={{position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, scale: String(0.7 + 0.3 * s)}}>
        <BallMark size={190} />
        <div style={{fontSize: 128, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1}}>HoopTicker</div>
      </div>
      <div style={{position: 'absolute', top: 1010, left: 0, right: 0, textAlign: 'center', fontSize: 64, fontWeight: 700, color: C.lime, opacity: url, translate: `0 ${(1 - url) * 24}px`}}>hoopticker.com</div>
      <TickerBand style={{top: 1200, rotate: '-4deg'}} speed={9} />
    </AbsoluteFill>
  );
};

export const ChatVideo: React.FC<ChatProps> = (p) => {
  const f = useCurrentFrame();
  const list = messages(p);
  const visible = list.filter((m) => f >= m.at);

  // Camera: punch-in on "32", slow zoom on the % chip, snap back with a shake on WAIT.
  const punch = (at: number, amount: number) => (f < at ? 0 : amount * Math.exp(-(f - at) / 7) * Math.min(1, (f - at + 1) / 3));
  const zoomIn = interpolate(f, [T.pctIn - 8, T.wait], [0, 0.42], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  const zoomOut = interpolate(f, [T.wait, T.wait + 7], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const zoom = f < T.wait ? zoomIn : zoomIn * zoomOut;
  // Hook: open tight on the first bubble, pull back as the thread starts.
  const hook = interpolate(f, [0, 40], [0.32, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const scale = 1 + hook + zoom + punch(90, 0.05) + punch(T.wait, 0.04);
  const shakeOn = f >= T.wait && f < T.wait + 14;
  const shake = shakeOn ? (1 - (f - T.wait) / 14) * 18 : 0;
  const sx = shake * (random(`sx${f}`) - 0.5) * 2;
  const sy = shake * (random(`sy${f}`) - 0.5) * 2;
  // The % chip sits around (905, 1010) once the screenshot has landed.
  const origin = f >= T.shot ? '905px 1010px' : f < 45 ? '1010px 1750px' : '540px 1200px';

  return (
    <AbsoluteFill style={{background: CHAT.bg, overflow: 'hidden'}}>
      <AbsoluteFill style={{scale: String(scale), transformOrigin: origin, translate: `${sx}px ${sy}px`}}>
        <Watermark f={f} p={p} />
        <div style={{position: 'absolute', left: 44, right: 44, bottom: 1920 - 1420, display: 'flex', flexDirection: 'column'}}>
          <div style={{textAlign: 'center', fontFamily: FONT, fontSize: 28, color: CHAT.meta, marginBottom: 14}}>
            <b style={{color: C.muted}}>Today</b> 8:14 AM
          </div>
          {visible.map((m, i) => (
            <Bubble key={m.at} m={m} f={f} prevFrom={visible[i - 1]?.from} first={i === 0} p={p} />
          ))}
          {f >= T.typing && f < 158 ? (
            <div style={{marginTop: 34, display: 'flex'}}>
              <TypingDots t={f - T.typing} />
            </div>
          ) : null}
        </div>
        <Header />
        <Composer />
      </AbsoluteFill>
      {f >= T.end ? <EndCard t={f - T.end} /> : null}
      <Grain />
      {list.map((m) => (
        <Sequence key={m.at} from={m.at} durationInFrames={30} layout="none">
          <Audio src={staticFile(`sfx/${m.sfx}.wav`)} volume={m.sfx === 'whoosh' ? 0.9 : 0.7} />
        </Sequence>
      ))}
      <Sequence from={T.pctIn} durationInFrames={15} layout="none">
        <Audio src={staticFile('sfx/blip.wav')} volume={0.8} />
      </Sequence>
      <Sequence from={T.typing} durationInFrames={10} layout="none">
        <Audio src={staticFile('sfx/pop.wav')} volume={0.35} />
      </Sequence>
      <Sequence from={T.end} durationInFrames={32} layout="none">
        <Audio src={staticFile('sfx/buzzer.wav')} volume={0.75} />
      </Sequence>
    </AbsoluteFill>
  );
};
