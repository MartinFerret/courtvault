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
import { PATHS, cardPath, moversPath, playerPath } from '@/lib/paths';
import { FreshnessLine } from './freshness';

/**
 * The product in one band: a stat line from last night on the left (ink), the asking price of
 * the same player's card this morning on the right (lime). Picks the performance whose card
 * moved the most; without prices, the best performance and the catalog facts. Both are facts
 * side by side: the copy never says one caused the other.
 */
export function LastNightModule({
  night,
  freshness,
  slugs,
  cardCount,
}: {
  night: LastNight;
  freshness: Freshness | null;
  slugs: { cards: Map<string, string>; players: Map<string, string> };
  cardCount: number | null;
}) {
  const pick = pickPerformance(night.performances);
  if (!pick || !night.day) return null;
  // The everyday reference first (Base, raw), then whatever moved, then the most valuable card.
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
        <p className="lnm__kicker">Last night, {formatEasternDay(night.day)}</p>
        <p className="lnm__who">
          <Link href={playerPath(slugs.players.get(pick.player_slug) ?? pick.player_slug)}>
            {pick.player_name}
          </Link>
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
            <p className="lnm__note">
              Median asking price on eBay. After the game, not because of it.
            </p>
          </>
        ) : (
          <>
            <p className="lnm__value lnm__value--text">
              {cardCount
                ? `${cardCount} card${cardCount > 1 ? 's' : ''} in the catalog`
                : 'His cards are in the catalog'}
            </p>
            <p className="lnm__note">
              Asking prices appear here after the first nightly price update. Box scores are already
              in.
            </p>
          </>
        )}
        <p className="lnm__links">
          <Link href={moversPath(night.day)}>Every mover and box score of the night</Link>
        </p>
      </div>
      <div className="lnm__foot">
        <FreshnessLine data={freshness} />
        <p>
          Box score and asking prices, side by side, every morning.{' '}
          <Link href={PATHS.method}>How we price cards</Link>
        </p>
      </div>
    </section>
  );
}

/** The performance with the largest overnight card move, or the best game score of the night. */
function pickPerformance(performances: Performance[]): Performance | null {
  if (performances.length === 0) return null;
  const moved = performances
    .map((p) => ({
      p,
      move: Math.max(0, ...p.top_cards.map((c) => Math.abs(c.change_cents ?? 0))),
    }))
    .filter((x) => x.move > 0)
    .sort((a, b) => b.move - a.move)[0];
  return moved?.p ?? performances[0] ?? null;
}
