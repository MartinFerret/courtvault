import { formatCents } from '@courtvault/shared';
import type React from 'react';
import { AbsoluteFill } from 'remotion';
import '../../web/src/app/globals.css';
import { FoilFrame, LogoMark } from './DuetClip';
import { chartSlot, dataAsOf, priceLines, type DuetData } from './model';

export type DuetImageProps = { data: DuetData | null; layout: 'half' | 'full' };

/**
 * Static image for the bottom half of a Duet (half) or the side-by-side layout (full, shown at
 * half width, so everything sits in the central 80% with extra large text). 60 px minimum
 * margin everywhere; on the half image the lower part stays free for TikTok's caption.
 */
const L = {
  half: { pad: 60, headline: 66, cardZoom: 1.9, lineH: 150, evidence: 32, foot: 40, rowGap: 34 },
  full: { pad: 108, headline: 118, cardZoom: 3.1, lineH: 220, evidence: 46, foot: 60, rowGap: 46 },
} as const;

const Sparkline: React.FC<{ series: { cents: number }[]; w: number; h: number }> = ({
  series,
  w,
  h,
}) => {
  const vals = series.map((p) => p.cents);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const d = series
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'} ${(i / (series.length - 1)) * (w - 8) + 4} ${max === min ? h / 2 : 4 + (1 - (p.cents - min) / (max - min)) * (h - 8)}`,
    )
    .join(' ');
  const up = vals[vals.length - 1]! >= vals[0]!;
  return (
    <svg width={w} height={h}>
      <path
        d={d}
        fill="none"
        stroke={up ? 'var(--cv-gain)' : 'var(--cv-loss)'}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const DuetImage: React.FC<DuetImageProps> = ({ data, layout }) => {
  const k = L[layout];
  if (!data) {
    return (
      <AbsoluteFill
        style={{
          background: 'var(--cv-bg)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--cv-font)',
          fontSize: 36,
          color: 'var(--cv-text-muted)',
        }}
      >
        No data loaded. Render with: pnpm image:duet &lt;card-slug&gt;
      </AbsoluteFill>
    );
  }
  const lines = priceLines(data);
  const slot = chartSlot(data);
  const asOf = dataAsOf(data);
  const Line: React.FC<{ l: (typeof lines)[number] }> = ({ l }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: k.lineH,
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
        <span style={{ fontSize: k.lineH * 0.22, fontWeight: 700 }}>{l.grade}</span>
        <span style={{ fontSize: k.lineH * 0.16, color: 'var(--cv-text-muted)' }}>{l.state}</span>
      </div>
      <div
        style={{
          fontSize: k.lineH * 0.46,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.02,
          whiteSpace: 'nowrap',
        }}
      >
        {formatCents(l.cents)}
      </div>
    </div>
  );
  const evidence =
    slot.kind === 'sparkline' ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Sparkline
          series={slot.series}
          w={layout === 'half' ? 260 : 420}
          h={layout === 'half' ? 70 : 110}
        />
        <span style={{ fontSize: k.evidence, color: 'var(--cv-text-muted)' }}>
          Raw, last 30 days
        </span>
      </div>
    ) : slot.kind === 'evidence' ? (
      <div style={{ fontSize: k.evidence, fontWeight: 600, lineHeight: 1.2 }}>{slot.text}</div>
    ) : null;
  const date = asOf ? (
    <div style={{ fontSize: k.evidence * 0.8, color: 'var(--cv-text-muted)' }}>
      Prices as of {asOf}
    </div>
  ) : null;
  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', gap: k.foot * 0.4 }}>
      <LogoMark size={k.foot * 1.6} />
      <span style={{ fontSize: k.foot, fontWeight: 700, letterSpacing: '-0.02em' }}>
        hoopticker.com
      </span>
    </div>
  );
  const headline = (
    <div
      style={{ fontSize: k.headline, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.02 }}
    >
      Never sell under market again
    </div>
  );

  return (
    <AbsoluteFill
      style={{ background: 'var(--cv-bg)', color: 'var(--cv-text)', fontFamily: 'var(--cv-font)' }}
    >
      {layout === 'half' ? (
        <div
          style={{
            position: 'absolute',
            left: k.pad,
            right: 120,
            top: k.pad,
            display: 'flex',
            flexDirection: 'column',
            gap: k.rowGap,
          }}
        >
          {headline}
          <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            <FoilFrame data={data} zoom={k.cardZoom} f={999} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {lines.map((l) => (
                <Line key={l.grade} l={l} />
              ))}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 30,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {evidence}
              {date}
            </div>
            {footer}
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: k.pad,
            right: k.pad,
            top: 192,
            bottom: 192,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'center',
          }}
        >
          {headline}
          <div style={{ textAlign: 'left' }}>
            <FoilFrame data={data} zoom={k.cardZoom} f={999} />
          </div>
          <div
            style={{ width: '100%', display: 'flex', flexDirection: 'column', textAlign: 'left' }}
          >
            {lines.map((l) => (
              <Line key={l.grade} l={l} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {evidence}
            {date}
          </div>
          {footer}
        </div>
      )}
    </AbsoluteFill>
  );
};
