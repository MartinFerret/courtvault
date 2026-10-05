import { easternHourOf, isIsoDay, previousEasternDay, toEasternDay } from './dates.ts';
import { error, json, readJson } from './http.ts';
import { requireEnv } from './env.ts';
import { type ServiceClient, serviceClient } from './supabase.ts';

export interface JobContext {
  supabase: ServiceClient;
  /** US Eastern day the job is about ("last night" for stats = the previous Eastern day). */
  day: string;
  runKey: string;
  force: boolean;
  log: (message: string, extra?: Record<string, unknown>) => void;
}

export interface JobOptions {
  name: string;
  /** Hour (America/New_York) before which a scheduled firing is skipped. See cron migration. */
  targetHourEt: number;
  /** Which Eastern day the job targets, relative to now. Stats look at last night (-1). */
  dayOffset?: number;
}

interface JobBody {
  day?: string;
  force?: boolean | string;
}

/**
 * Standard wrapper for scheduled jobs:
 * 1. authenticates the caller with the shared x-job-secret (pg_cron or the dev script),
 * 2. skips when fired before the target local hour (DST handling, see cron migration),
 * 3. guarantees one run per Eastern day via job_runs (idempotent, retry after failure),
 * 4. records the outcome.
 */
export function defineJob(
  options: JobOptions,
  run: (ctx: JobContext) => Promise<Record<string, unknown>>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const secret = requireEnv('JOB_SECRET');
    if (req.headers.get('x-job-secret') !== secret) return error('Unauthorized', 401);

    const body = await readJson<JobBody>(req);
    const force = body.force === true || body.force === 'true';
    const now = new Date();
    const offset = options.dayOffset ?? 0;
    const day = isIsoDay(body.day)
      ? body.day
      : offset === -1
      ? previousEasternDay(now)
      : toEasternDay(now);
    const runKey = day;

    if (!force && easternHourOf(now) < options.targetHourEt) {
      return json({
        job: options.name,
        status: 'skipped',
        reason: `local hour ${easternHourOf(now)} < target ${options.targetHourEt}`,
      });
    }

    const supabase = serviceClient();
    const { data: owns, error: startError } = await supabase.rpc('start_job_run', {
      p_job: options.name,
      p_run_key: runKey,
    });
    if (startError) return error(`start_job_run failed: ${startError.message}`, 500);
    if (!owns && !force) {
      return json({ job: options.name, status: 'skipped', reason: `already ran for ${runKey}` });
    }

    const log = (message: string, extra: Record<string, unknown> = {}) =>
      console.log(JSON.stringify({ job: options.name, runKey, message, ...extra }));

    try {
      const details = await run({ supabase, day, runKey, force, log });
      await supabase.rpc('finish_job_run', {
        p_job: options.name,
        p_run_key: runKey,
        p_status: 'success',
        p_details: details,
      });
      return json({ job: options.name, status: 'success', day, ...details });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log('failed', { error: message });
      await supabase.rpc('finish_job_run', {
        p_job: options.name,
        p_run_key: runKey,
        p_status: 'error',
        p_error: message,
      });
      return error(message, 500, { job: options.name, day });
    }
  };
}
