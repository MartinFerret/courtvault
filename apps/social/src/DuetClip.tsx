import { formatCents, formatParallel, GRADE_LABELS } from '@courtvault/shared';
import outfitUrl from '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2';
import { loadFont } from '@remotion/fonts';
import type React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
// The website's own stylesheet: same tokens (--cv-*), same .foil card frames.
import '../../web/src/app/globals.css';
import { chartSlot, priceLines, webFoilTier, type DuetData } from './model';

loadFont({ family: 'Outfit Variable', url: outfitUrl, weight: '100 900' });

export type DuetProps = { data: DuetData | null; layout: 'half' | 'full' };

/** 11 s at 30 fps. */
export const DUET_FRAMES = 330;
const T = { card: 0, lines: 34, lineGap: 22, chart: 118, headline: 196, cta: 256 };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = Easing.out(Easing.cubic);

/**
 * Layout boxes. TikTok safe zones: nothing in the bottom 25% and 120 px clear on the right
 * (action buttons); on the full-height version 250 px clear at the top as well.
 */
const BOX = {
  half: {
    left: 60,
    right: 960,
    top: 56,
    bottom: 720,
    cardZoom: 2.0,
    cardTop: 70,
    linesLeft: 540,
    linesTop: 56,
    lineH: 160,
    chartTop: 470,
    chartH: 210,
    headline: 96,
    cta: 50,
  },
  full: {
    left: 60,
    right: 960,
    top: 250,
    bottom: 1440,
    cardZoom: 2.9,
    cardTop: 280,
    linesLeft: 90,
    linesTop: 720,
    lineH: 180,
    chartTop: 1150,
    chartH: 250,
    headline: 112,
    cta: 58,
  },
} as const;

const LogoMark: React.FC<{ size: number }> = ({ size }) => (
  // Same drawing as apps/web/src/components/logo.tsx, on the ink chip used by the app header.
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: 'var(--cv-text)',
      display: 'grid',
      placeItems: 'center',
    }}
  >
    <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 64 64" aria-label="HoopTicker">
      <g
        fill="none"
        stroke="var(--cv-accent)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="32" cy="32" r="27.5" />
        <path d="M32 4.5v55" />
        <path d="M13.5 12.5C25 21 25 43 13.5 51.5" />
        <path d="M50.5 12.5C39 21 39 43 50.5 51.5" />
        <path d="M4.5 32h18l6-8 5 5 13.5-12.5" />
      </g>
    </svg>
  </div>
);

/** The website's generic foil frame (apps/web/src/components/foil-card.tsx), scaled up. */
const FoilFrame: React.FC<{ data: DuetData; zoom: number; f: number }> = ({ data, zoom, f }) => {
  const c = data.card;
  const tier = webFoilTier(c.parallel, c.serialRun);
  const s = interpolate(f, [T.card, T.card + 22], [0.86, 1], { ...clamp, easing: easeOut });
  const o = interpolate(f, [T.card, T.card + 8], [0, 1], clamp);
  const sheen = interpolate(f, [8, 40], [-60, 160], clamp);
  return (
    <div
      style={{
        zoom,
        opacity: o,
        scale: String(s),
        transformOrigin: '30% 40%',
        position: 'relative',
        width: 220,
      }}
    >
      <div
        className={`foil foil--${tier}`}
        style={{ width: 220, minHeight: 150, overflow: 'hidden', position: 'relative' }}
      >
        <span className="foil__top">
          <span className="foil__number">#{c.number}</span>
          {c.isRookie ? <span className="foil__rc">RC</span> : null}
        </span>
        <span className="foil__player">{c.player}</span>
        <span className="foil__meta">
          {formatParallel(c.parallel, c.serialRun)} · {GRADE_LABELS.RAW} to {GRADE_LABELS.PSA10}
        </span>
        <span className="foil__set">
          {c.season} {c.set}
        </span>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.7) 50%, transparent 65%)',
            translate: `${sheen}% 0`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

const Lines: React.FC<{
  data: DuetData;
  box: (typeof BOX)['half' | 'full'];
  f: number;
  width: number;
}> = ({ data, box, f, width }) => {
  const lines = priceLines(data);
  return (
    <div style={{ position: 'absolute', left: box.linesLeft, top: box.linesTop, width }}>
      {lines.map((l, i) => {
        const at = T.lines + i * T.lineGap;
        const t = interpolate(f, [at, at + 12], [0, 1], { ...clamp, easing: easeOut });
        const count = interpolate(f, [at, at + 20], [0, l.cents], { ...clamp, easing: easeOut });
        return (
          <div
            key={l.grade}
            style={{
              height: box.lineH,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              opacity: t,
              translate: `${(1 - t) * 40}px 0`,
              borderBottom: i < lines.length - 1 ? '2px solid var(--cv-surface-2)' : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 16,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: box.lineH * 0.2, fontWeight: 700 }}>{l.grade}</span>
              <span style={{ fontSize: box.lineH * 0.14, color: 'var(--cv-text-muted)' }}>
                {l.state}
              </span>
            </div>
            <div
              style={{
                fontSize: box.lineH * 0.42,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {formatCents(Math.round(count))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Chart: React.FC<{ data: DuetData; box: (typeof BOX)['half' | 'full']; f: number }> = ({
  data,
  box,
  f,
}) => {
  const slot = chartSlot(data);
  const w = box.right - box.left;
  const t = interpolate(f, [T.chart, T.chart + 40], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  if (slot.kind === 'none') return null;
  if (slot.kind === 'evidence') {
    return (
      <div
        style={{
          position: 'absolute',
          left: box.left,
          top: box.chartTop,
          width: w,
          height: box.chartH,
          borderRadius: 'var(--cv-radius-lg)',
          background: 'var(--cv-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          padding: '0 40px',
          opacity: Math.min(1, t * 3),
        }}
      >
        <div
          style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: box.chartH * 0.42 }}
        >
          {[0.45, 0.7, 0.55, 0.9, 0.65].map((h, i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: `${h * 100 * Math.min(1, Math.max(0, t * 2 - i * 0.15))}%`,
                borderRadius: 6,
                background: i === 4 ? 'var(--cv-accent)' : 'var(--cv-text)',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: box.chartH * 0.19, fontWeight: 600, lineHeight: 1.15 }}>
          {slot.text}
        </div>
      </div>
    );
  }
  const vals = slot.series.map((p) => p.cents);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const h = box.chartH - 70;
  const path = slot.series
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'} ${(i / (slot.series.length - 1)) * (w - 80) + 40} ${20 + (max === min ? h / 2 : (1 - (p.cents - min) / (max - min)) * h)}`,
    )
    .join(' ');
  const up = vals[vals.length - 1]! >= vals[0]!;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.left,
        top: box.chartTop,
        width: w,
        height: box.chartH,
        borderRadius: 'var(--cv-radius-lg)',
        background: 'var(--cv-surface)',
      }}
    >
      <svg width={w} height={box.chartH}>
        <path
          d={path}
          fill="none"
          stroke={up ? 'var(--cv-gain)' : 'var(--cv-loss)'}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - t}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 40,
          bottom: 16,
          fontSize: 24,
          color: 'var(--cv-text-muted)',
        }}
      >
        Raw, last 30 days
      </div>
    </div>
  );
};

export const DuetClip: React.FC<DuetProps> = ({ data, layout }) => {
  const f = useCurrentFrame();
  const box = BOX[layout];
  const width = box.right - box.left;
  const dataOut = interpolate(f, [T.headline - 10, T.headline], [1, 0], clamp);
  const head = interpolate(f, [T.headline, T.headline + 12], [0, 1], { ...clamp, easing: easeOut });
  const headOut = interpolate(f, [T.cta - 8, T.cta], [1, 0], clamp);
  const cta = interpolate(f, [T.cta, T.cta + 14], [0, 1], { ...clamp, easing: easeOut });
  const midY = (box.top + box.bottom) / 2;

  return (
    <AbsoluteFill
      style={{ background: 'var(--cv-bg)', color: 'var(--cv-text)', fontFamily: 'var(--cv-font)' }}
    >
      {data === null ? (
        <div
          style={{
            margin: 'auto',
            fontSize: 36,
            color: 'var(--cv-text-muted)',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          No data loaded. Render with: pnpm video:duet &lt;card-slug&gt;
        </div>
      ) : (
        <>
          <div style={{ opacity: dataOut }}>
            <div
              style={{
                position: 'absolute',
                left:
                  layout === 'half'
                    ? box.left
                    : (box.left + box.right) / 2 - (220 * box.cardZoom) / 2,
                top: box.cardTop,
              }}
            >
              <FoilFrame data={data} zoom={box.cardZoom} f={f} />
            </div>
            <Lines
              data={data}
              box={box}
              f={f}
              width={
                layout === 'half'
                  ? box.right - box.linesLeft
                  : width - 2 * (box.linesLeft - box.left)
              }
            />
            <Chart data={data} box={box} f={f} />
          </div>
          {f >= T.headline && f < T.cta ? (
            <div
              style={{
                position: 'absolute',
                left: box.left,
                width,
                top: midY,
                translate: `0 calc(-50% + ${(1 - head) * 40}px)`,
                opacity: head * headOut,
                textAlign: 'center',
                fontSize: box.headline,
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1.02,
              }}
            >
              Never sell under market again
            </div>
          ) : null}
          {f >= T.cta ? (
            <div
              style={{
                position: 'absolute',
                left: box.left,
                width,
                top: midY,
                translate: `0 calc(-50% + ${(1 - cta) * 40}px)`,
                opacity: cta,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: box.cta * 0.6,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  fontSize: box.cta * 1.1,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                <LogoMark size={box.cta * 1.9} />
                HoopTicker
              </div>
              <div style={{ fontSize: box.cta, fontWeight: 600, lineHeight: 1.2, maxWidth: width }}>
                Check what your cards are worth every morning →
              </div>
              <div
                style={{
                  fontSize: box.cta * 1.05,
                  fontWeight: 700,
                  padding: `${box.cta * 0.25}px ${box.cta * 0.7}px`,
                  borderRadius: 999,
                  background: 'var(--cv-accent)',
                  color: 'var(--cv-on-accent, #121417)',
                }}
              >
                hoopticker.com
              </div>
            </div>
          ) : null}
        </>
      )}
    </AbsoluteFill>
  );
};
