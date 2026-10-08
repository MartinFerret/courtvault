/**
 * job-schedule: today's games -> game_days (first tip-off = the Vault Score lineup lock).
 * Target 6:00 AM New York, one Highlightly request per day (16 + 1 of the 100 free requests).
 * The lock itself is pure SQL (lock_due_game_days, pg_cron every 5 minutes).
 */
import { defineJob } from '../_shared/jobs.ts';
import { serve } from '../_shared/http.ts';
import { createStatsProvider } from '../_shared/providers/index.ts';
import { firstTipOff } from './schedule.ts';

serve(
  defineJob(
    { name: 'job-schedule', targetHourEt: 6, dayOffset: 0 },
    async ({ supabase, day, log }) => {
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('name, team');
      if (playersError) throw playersError;
      const provider = createStatsProvider(players ?? []);
      const games = await provider.gamesForDay(day);
      const { firstTipAt, count } = firstTipOff(games);
      log('schedule', { provider: provider.name, games: count, firstTipAt });

      const { error } = await supabase.rpc('record_schedule', {
        p_day: day,
        p_first_tip_at: firstTipAt,
        p_games: count,
      });
      if (error) throw error;
      return { provider: provider.name, day, games: count, first_tip_at: firstTipAt };
    },
  ),
);
