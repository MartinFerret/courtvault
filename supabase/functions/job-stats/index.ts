/**
 * job-stats: last night's games and box scores -> games + player_game_lines, then the
 * Vault Score of last night's locked lineups (score_game_day, a no-op while the game is off).
 * Target 5:00 AM New York. Highlightly free plan: 100 requests/day; one night costs ~16.
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve } from '../_shared/http.ts';
import { sleep } from '../_shared/http.ts';
import { createStatsProvider } from '../_shared/providers/index.ts';

function normalizeName(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim();
}

serve(
  defineJob(
    { name: 'job-stats', targetHourEt: 5, dayOffset: -1 },
    async ({ supabase, day, log }) => {
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, team, highlightly_id');
      if (playersError) throw playersError;
      const byExternalId = new Map<number, string>();
      const byName = new Map<string, string>();
      for (const p of players ?? []) {
        if (p.highlightly_id !== null) byExternalId.set(p.highlightly_id, p.id);
        byName.set(normalizeName(p.name), p.id);
      }

      const provider = createStatsProvider(
        (players ?? []).map((p) => ({ name: p.name, team: p.team })),
      );
      const games = await provider.gamesForDay(day);
      log('games fetched', { provider: provider.name, count: games.length });

      let linesUpserted = 0;
      let idsLearned = 0;
      for (const game of games) {
        const { data: gameRow, error: gameError } = await supabase
          .from('games')
          .upsert(
            {
              external_id: game.externalId,
              game_day: game.gameDay,
              home_team: game.homeTeam,
              away_team: game.awayTeam,
              home_score: game.homeScore,
              away_score: game.awayScore,
              status: game.status,
              starts_at: game.startsAt,
            },
            { onConflict: 'external_id' },
          )
          .select('id')
          .single();
        if (gameError) throw gameError;

        if (game.status === 'scheduled') continue;

        const lines = await provider.boxScore(game.externalId);
        const rows = [];
        for (const line of lines) {
          let playerId = line.externalPlayerId !== null
            ? byExternalId.get(line.externalPlayerId)
            : undefined;
          if (!playerId) {
            playerId = byName.get(normalizeName(line.playerName));
            if (playerId && line.externalPlayerId !== null) {
              // Learn the provider id so future matches do not depend on the spelling.
              await supabase.from('players').update({ highlightly_id: line.externalPlayerId }).eq(
                'id',
                playerId,
              );
              byExternalId.set(line.externalPlayerId, playerId);
              idsLearned++;
            }
          }
          if (!playerId) continue; // player not in the catalog: nothing to track
          rows.push({
            game_id: gameRow.id,
            player_id: playerId,
            minutes: line.minutes,
            points: line.points,
            rebounds: line.rebounds,
            assists: line.assists,
            steals: line.steals,
            blocks: line.blocks,
            turnovers: line.turnovers,
            team: line.team || null,
            raw: line.raw,
          });
        }
        if (rows.length > 0) {
          const { error: linesError } = await supabase
            .from('player_game_lines')
            .upsert(rows, { onConflict: 'game_id,player_id' });
          if (linesError) throw linesError;
          linesUpserted += rows.length;
        }
        if (provider.name !== 'mock') await sleep(250); // be gentle with the free plan
      }

      const { data: scored, error: scoreError } = await supabase.rpc('score_game_day', {
        p_day: day,
      });
      if (scoreError) throw scoreError;
      // Standings snapshots, badges and abuse flags (no-ops before the regular season).
      const { data: after, error: afterError } = await supabase.rpc('after_scoring', {
        p_day: day,
      });
      if (afterError) throw afterError;
      log('vault score', { lineups: scored, after });

      return {
        provider: provider.name,
        games: games.length,
        lines: linesUpserted,
        idsLearned,
        lineupsScored: scored,
        vaultScore: after,
      };
    },
  ),
);
