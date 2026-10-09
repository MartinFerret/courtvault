import type React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './theme';

type Word = {text: string; key: boolean; index: number};

/** Splits the line into words and flags the ones inside the highlighted phrase. */
function splitWords(text: string, keyword: string): Word[] {
  const upper = text.toUpperCase();
  const start = keyword ? upper.indexOf(keyword.toUpperCase()) : -1;
  const end = start >= 0 ? start + keyword.length : -1;
  const words: Word[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(upper))) {
    const s = m.index;
    const e = s + m[0].length;
    words.push({text: m[0], key: start >= 0 && s >= start && e <= end + 1, index: i++});
  }
  return words;
}

/**
 * Uppercase, centered headline. Words rise in one after another (a beat each), then the
 * keyword turns lime with a short pop: the eye lands on it last, and remembers it.
 * `still` shows the settled state (carousel images).
 */
export const Headline: React.FC<{
  text: string;
  keyword: string;
  size?: number;
  delay?: number;
  stagger?: number;
  still?: boolean;
  style?: React.CSSProperties;
}> = ({text, keyword, size = 96, delay = 0, stagger = 2.2, still = false, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = splitWords(text, keyword);
  const lastIn = delay + (words.length - 1) * stagger;
  const keyAt = lastIn + 0.25 * fps;
  const f = still ? 10_000 : frame;

  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: '-0.025em',
        color: C.text,
        textAlign: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: size * 0.26,
        rowGap: size * 0.06,
        textWrap: 'balance',
        ...style,
      }}
    >
      {words.map((w) => {
        const t0 = delay + w.index * stagger;
        return (
          <span
            key={w.index}
            style={{
              display: 'inline-block',
              opacity: interpolate(f, [t0, t0 + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              translate: interpolate(f, [t0, t0 + 10], ['0px 46px', '0px 0px'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
              color: w.key
                ? interpolate(f, [keyAt, keyAt + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) > 0.5
                  ? C.lime
                  : C.text
                : C.text,
              scale: w.key
                ? interpolate(f, [keyAt, keyAt + 5, keyAt + 12], [1, 1.09, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                  })
                : 1,
              textShadow: w.key ? '0 0 34px rgba(227,251,74,0.35)' : '0 6px 30px rgba(0,0,0,0.45)',
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
