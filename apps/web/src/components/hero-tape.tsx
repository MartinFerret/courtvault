import { formatParallel, formatPercent, nightLabel } from '@courtvault/shared';
import type { LastNight } from '@/lib/last-night';

/**
 * Ticker tape at the foot of the homepage hero: last night's best stat lines, card moves and
 * final scores, side by side as facts (never one causing the other). The list is rendered
 * twice so the CSS loop is seamless; the copy is hidden from assistive technology.
 */
export function HeroTape({ night }: { night: LastNight | null }) {
  if (!night?.day) return null;
  const lines = [...night.performances]
    .sort((a, b) => b.game_score - a.game_score)
    .slice(0, 5)
    .map((p) => ({
      key: `p-${p.player_slug}`,
      text: `${p.player_name} ${p.points ?? 0} pts, ${p.rebounds ?? 0} reb, ${p.assists ?? 0} ast`,
      move: null as 'up' | 'down' | null,
    }));
  const moves = [...night.gainers.slice(0, 3), ...night.losers.slice(0, 2)].map((m) => ({
    key: `m-${m.card_slug}-${m.parallel_name}-${m.grade}`,
    text: `${m.player_name} #${m.card_number} ${formatParallel(m.parallel_name, m.serial_run)} ${formatPercent(m.change_pct)}`,
    move: (m.change_pct >= 0 ? 'up' : 'down') as 'up' | 'down',
  }));
  const scores = night.games
    .filter((g) => g.home_score !== null && g.away_score !== null)
    .map((g) => ({
      key: `g-${g.id}`,
      text: `${g.away_team} ${g.away_score}, ${g.home_team} ${g.home_score}`,
      move: null as 'up' | 'down' | null,
    }));
  // Interleave so stats, moves and scores alternate along the tape.
  const items: typeof scores = [];
  for (let i = 0; i < Math.max(lines.length, moves.length, scores.length); i++) {
    for (const list of [lines, moves, scores]) {
      const item = list[i];
      if (item) items.push(item);
    }
  }
  if (items.length === 0) return null;

  const run = (hidden: boolean) => (
    <ul className="tape__run" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item.key} className="tape__item">
          {item.move ? (
            <span className={`tape__arrow tape__arrow--${item.move}`} aria-hidden="true" />
          ) : null}
          {item.text}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="tape"
      role="region"
      aria-label={`${nightLabel(night.day).label}: stat lines, card moves and final scores`}
    >
      <p className="tape__label">{nightLabel(night.day).label}</p>
      <div className="tape__track">
        <div className="tape__belt">
          {run(false)}
          {run(true)}
        </div>
      </div>
    </div>
  );
}
