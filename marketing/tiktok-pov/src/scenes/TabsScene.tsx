import type React from 'react';
import {AbsoluteFill, Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame, type InteractivitySchema} from 'remotion';
import {Arena, Grain} from '../brand/Backdrop';
import {Headline} from '../brand/Headline';
import {MiddleThird} from '../brand/Stage';
import {C, FONT} from '../brand/theme';

const TITLES = [
  'Chrome Flagg #251 sold',
  'Harper RC refractor',
  'Wemby gold /50 sold',
  'Bailey RC prices',
  'Edgecombe PSA 10',
  'Chrome #251 auction',
  'Knueppel refractor',
  'sold listings…',
  'card price guide',
  'Flagg RC /99',
  'completed items',
  'Sapphire #252',
];

/** A browser drowning in tabs, blurred (no site logo readable). New tabs keep opening. */
const THUMBS = [
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--red-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--blue-refractor.webp',
  'topps/2025-26-topps-basketball-shai-gilgeous-alexander-card-115.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--green-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--magenta-refractor.webp',
  'topps/2025-26-topps-chrome-victor-wembanyama-card-221--yellow-refractor.webp',
];

const Browser: React.FC<{still: boolean; topps: boolean}> = ({still, topps}) => {
  const frame = useCurrentFrame();
  const open = still ? TITLES.length : Math.min(TITLES.length, 4 + Math.floor(frame / 3));
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top: 250,
        height: 640,
        borderRadius: 28,
        background: '#e8eaed',
        overflow: 'hidden',
        rotate: '-3deg',
        filter: 'blur(3.5px)',
        opacity: 0.62,
        boxShadow: '0 40px 90px rgba(0,0,0,0.6)',
        scale: interpolate(frame, [0, 70], [1.06, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)}),
      }}
    >
      <div style={{display: 'flex', gap: 4, padding: '18px 18px 0', background: '#cfd3d8'}}>
        {TITLES.slice(0, open).map((t, i) => (
          <div
            key={t}
            style={{
              flex: 1,
              minWidth: 0,
              height: 56,
              borderRadius: '14px 14px 0 0',
              background: i === open - 1 ? '#ffffff' : '#dfe2e6',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
              fontFamily: FONT,
              fontSize: 22,
              color: '#3c4043',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <span style={{width: 18, height: 18, borderRadius: 9, background: '#9aa0a6', flex: '0 0 auto'}} />
            {t}
          </div>
        ))}
      </div>
      <div style={{background: '#ffffff', height: '100%', padding: 28, display: 'flex', flexDirection: 'column', gap: 18}}>
        {Array.from({length: 6}, (_, i) => (
          <div key={i} style={{display: 'flex', gap: 22, alignItems: 'center'}}>
            {topps ? (
              <Img src={staticFile(THUMBS[i]!)} style={{width: 110, height: 154, objectFit: 'cover', borderRadius: 8}} />
            ) : (
              <div style={{width: 110, height: 110, borderRadius: 12, background: '#d8dce0'}} />
            )}
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 12}}>
              <div style={{height: 22, width: `${70 - i * 6}%`, borderRadius: 6, background: '#c4c8cc'}} />
              <div style={{height: 22, width: '30%', borderRadius: 6, background: '#1f9d55', opacity: 0.6}} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

type Props = {readonly text: string; readonly keyword: string; readonly topps: boolean; readonly still: boolean; readonly style?: React.CSSProperties};

const TabsSceneInner: React.FC<Props> = ({text, keyword, topps, still, style}) => (
  <AbsoluteFill style={{overflow: 'hidden', ...style}}>
    <Arena>
      <Browser still={still} topps={topps} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, transparent 30%, ${C.ink} 52%)`}} />
      <MiddleThird top={900} bottom={1280}>
        <Headline text={text} keyword={keyword} size={100} delay={2} still={still} />
      </MiddleThird>
    </Arena>
    <Grain />
  </AbsoluteFill>
);

const schema = {
  text: {type: 'text-content', default: 'YOU CHECK EBAY… ONE CARD AT A TIME', description: 'Text'},
  keyword: {type: 'text-content', default: 'ONE CARD AT A TIME', description: 'Highlighted words'},
  topps: {type: 'boolean', default: false, description: 'Official Topps thumbnails (only if the permission covers social media)'},
} as const satisfies InteractivitySchema;

export const TabsScene = Interactive.withSchema({Component: TabsSceneInner, componentName: '<TabsScene>', schema, wrapInSequence: true});
