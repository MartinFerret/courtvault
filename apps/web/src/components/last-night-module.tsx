import Link from 'next/link';
import {
  formatCents,
  formatCentsDelta,
  formatEasternDay,
  formatParallel,
  GRADE_LABELS,
} from '@courtvault/shared';
import type { Freshness } from '@/lib/freshness';
import { formatEasternTime } from '@/lib/freshness';
import type { LastNight, Performance } from '@/lib/last-night';
import { cardPath, moversPath, playerPath } from '@/lib/paths';
import { FreshnessLine } from './freshness';

/**
 * The product in one band: a stat line from last night on the left (ink), the asking price of
 * the same player's card this morning on the right (lime). The performance is chosen by
 * pickNotable(); without prices the right side is a one-line teaser. Both sides are facts side
 * by side: the copy never says one caused the other.
 */
export function LastNightModule({
  night,
  pick,
  freshness,
  slugs,
}: {
  night: LastNight;
  pick: Performance;
  freshness: Freshness | null;
  slugs: { cards: Map<string, string>; players: Map<string, string> };
}) {
  if (!night.day) return null;
  const card =
    pick.top_cards.find(
      (c) => c.parallel_name === 'Base' && c.grade === 'RAW' && c.change_cents !== null,
    ) ??
    pick.top_cards.find((c) => c.change_cents !== null) ??
    pick.top_cards[0] ??
    null;
  const updated = freshness?.prices_updated_at
    ? formatEasternTime(freshness.prices_updated_at)
    : null;
  const score = `${pick.away_team} ${pick.away_score ?? '-'}, ${pick.home_team} ${pick.home_score ?? '-'}`;
  return (
    <section className="lnm" aria-labelledby="lnm-title">
      <h2 id="lnm-title" className="sr-only">
        Last night, this morning
      </h2>
      <div className="lnm__night">
        <p className="lnm__kicker">
          Last night, {formatEasternDay(night.day)}
          {night.is_preseason ? <span className="tag">Preseason</span> : null}
        </p>
        <p className="lnm__who">
          <Link href={playerPath(slugs.players.get(pick.player_slug) ?? pick.player_slug)}>
            {pick.player_name}
          </Link>
          {pick.is_rookie ? <span className="badge">RC</span> : null}
          {pick.team ? <span className="lnm__team">{pick.team}</span> : null}
        </p>
        <dl className="lnm__stats">
          <div>
            <dd>{pick.points ?? 0}</dd>
            <dt>points</dt>
          </div>
          <div>
            <dd>{pick.rebounds ?? 0}</dd>
            <dt>rebounds</dt>
          </div>
          <div>
            <dd>{pick.assists ?? 0}</dd>
            <dt>assists</dt>
          </div>
          <div>
            <dd>{pick.minutes === null ? '–' : Math.round(pick.minutes)}</dd>
            <dt>minutes</dt>
          </div>
        </dl>
        <p className="lnm__game">{score}</p>
      </div>
      <div className="lnm__morning">
        <p className="lnm__kicker">This morning{updated ? `, ${updated}` : ''}</p>
        {card ? (
          <>
            <p className="lnm__card">
              <Link href={cardPath(slugs.cards.get(card.card_slug) ?? card.card_slug)}>
                {card.season} {card.set_name} #{card.card_number}
              </Link>
              <span className="lnm__parallel">
                {formatParallel(card.parallel_name, card.serial_run)}, {GRADE_LABELS[card.grade]}
              </span>
            </p>
            <p className="lnm__value">{formatCents(card.after_cents)}</p>
            <p className="lnm__delta">
              {card.change_cents === null || card.change_cents === 0 ? (
                <span>Same asking price as before tip-off.</span>
              ) : (
                <>
                  <span className={card.change_cents > 0 ? 'gain' : 'loss'}>
                    {formatCentsDelta(card.change_cents)}
                  </span>{' '}
                  since before tip-off
                </>
              )}
            </p>
          </>
        ) : (
          <p className="lnm__value lnm__value--text">Card values start with the regular season.</p>
        )}
        <p className="lnm__links">
          <Link href={moversPath(night.day)} data-attr="band-movers">
            Every performance and mover of the night
          </Link>
        </p>
      </div>
      <div className="lnm__foot">
        <FreshnessLine data={freshness} />
      </div>
    </section>
  );
}
