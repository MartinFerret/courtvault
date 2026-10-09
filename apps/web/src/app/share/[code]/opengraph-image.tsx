import { ImageResponse } from 'next/og';
import { formatCents, formatParallel } from '@courtvault/shared';
import { getShare } from '@/lib/data';

/**
 * Image of a share (lineup score, league rank, best cards): the arena look of the app, our
 * foil frame, never a Topps image or a player photo. Satori: flex boxes, one string per text.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;
export const alt = 'HoopTicker share';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const share = await getShare(code).catch(() => null);
  const p = share?.payload;
  let kicker = 'HoopTicker';
  let big = '';
  let unit = '';
  const lines: string[] = [];
  if (share && p) {
    if (share.kind === 'lineup') {
      kicker = `${p.username}'s lineup`;
      big = String(p.total ?? 0);
      unit = 'pts';
      for (const pl of (p.players ?? []).slice(0, 3))
        lines.push(`${pl.name}${pl.captain ? ' (C)' : ''}  ${pl.fpts} pts`);
    } else if (share.kind === 'league') {
      kicker = `${p.username} in ${p.league}`;
      big = `#${p.week_rank ?? '?'}`;
      unit = 'this week';
      lines.push(`${p.members} players, ${p.week_points ?? 0} pts this week`);
    } else {
      kicker = `${p.username}'s best cards`;
      big = String(p.card_count ?? 0);
      unit = 'cards';
      for (const c of (p.cards ?? []).slice(0, 3)) {
        lines.push(
          `${c.player} #${c.number} ${formatParallel(c.parallel, c.serial_run)}${c.value_cents ? `  ${formatCents(c.value_cents)}` : ''}`,
        );
      }
    }
  }
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        background:
          'radial-gradient(60% 50% at 20% 0%, rgba(255,246,222,0.16), transparent 70%), #121417',
        color: '#f2f4f5',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 34, color: '#a9b0b8' }}>{kicker}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div
          style={{
            display: 'flex',
            fontSize: 200,
            fontWeight: 700,
            lineHeight: 1,
            color: '#e3fb4a',
          }}
        >
          {big}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 48,
            marginLeft: 20,
            marginBottom: 24,
            color: '#e3fb4a',
          }}
        >
          {unit}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lines.map((l) => (
          <div key={l} style={{ display: 'flex', fontSize: 30, color: '#d6dadf', marginTop: 6 }}>
            {l}
          </div>
        ))}
        <div style={{ display: 'flex', fontSize: 28, marginTop: 28, color: '#868e97' }}>
          hoopticker.com
        </div>
      </div>
    </div>,
    size,
  );
}
