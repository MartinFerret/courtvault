import type React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {Arena, Grain} from '../brand/Backdrop';
import {Headline} from '../brand/Headline';
import {MiddleThird} from '../brand/Stage';
import {C, FONT, LED} from '../brand/theme';

/** Jumbotron stat line (no player name: nothing invented) and a giant question mark. */
const Scoreboard: React.FC<{still: boolean}> = ({still}) => {
  const frame = useCurrentFrame();
  const f = still ? 10_000 : frame;
  const stats: [string, string][] = [
    ['32', 'PTS'],
    ['9', 'REB'],
    ['6', 'AST'],
  ];
  return (
    <div
      style={{
        position: 'absolute',
        left: 120,
        right: 120,
        top: 330,
        height: 230,
        borderRadius: 30,
        padding: 8,
        background: '#0c0d0f',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07), 0 30px 80px rgba(0,0,0,0.6)',
        display: 'flex',
        gap: 6,
        translate: interpolate(f, [0, 12], ['0px -40px', '0px 0px'], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)}),
        opacity: interpolate(f, [0, 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      }}
    >
      {stats.map(([n, l], i) => (
        <div
          key={l}
          style={{
            flex: 1,
            borderRadius: 24,
            background: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 1.6px) 0 0 / 8px 8px, #16181c',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: LED,
              fontWeight: 600,
              fontSize: 128,
              lineHeight: 0.9,
              color: C.amber,
              textShadow: '0 0 18px rgba(255,178,62,0.55)',
              opacity: interpolate(f, [6 + i * 4, 10 + i * 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
            }}
          >
            {n}
          </span>
          <span style={{fontFamily: LED, fontWeight: 600, fontSize: 40, letterSpacing: '0.12em', color: C.muted}}>{l}</span>
        </div>
      ))}
    </div>
  );
};

type Props = {
  readonly text: string;
  readonly keyword: string;
  readonly subtitle: string;
  readonly still: boolean;
  readonly style?: React.CSSProperties;
};

const RookieSceneInner: React.FC<Props> = ({text, keyword, subtitle, still, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = still ? 10_000 : frame;
  return (
    <AbsoluteFill style={{overflow: 'hidden', ...style}}>
      <Arena>
        <AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 1100,
              lineHeight: 1,
              color: 'transparent',
              WebkitTextStroke: `6px rgba(227,251,74,0.22)`,
              translate: '0px 120px',
              scale: interpolate(f % (1.4 * fps), [0, 0.7 * fps, 1.4 * fps], [1, 1.035, 1], {easing: Easing.inOut(Easing.sin)}),
            }}
          >
            ?
          </span>
        </AbsoluteFill>
        <Scoreboard still={still} />
        <MiddleThird top={680}>
          <Headline text={text} keyword={keyword} size={100} delay={8} still={still} />
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 56,
              color: C.muted,
              fontStyle: 'italic',
              opacity: interpolate(f, [2 * fps, 2.2 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
            }}
          >
            {subtitle}
          </div>
        </MiddleThird>
      </Arena>
      <Grain />
    </AbsoluteFill>
  );
};

const schema = {
  text: {type: 'text-content', default: 'HE DROPS 32 LAST NIGHT. DID YOUR ROOKIE GO UP?', description: 'Text'},
  keyword: {type: 'text-content', default: 'DID YOUR ROOKIE GO UP?', description: 'Highlighted words'},
  subtitle: {type: 'text-content', default: 'no clue.', description: 'Subtitle'},
} as const satisfies InteractivitySchema;

export const RookieScene = Interactive.withSchema({Component: RookieSceneInner, componentName: '<RookieScene>', schema, wrapInSequence: true});
