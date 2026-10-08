/** Small HTTP helpers shared by every function. */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-job-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...headers },
  });
}

export function error(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {},
): Response {
  return json({ error: message, ...extra }, status);
}

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return null;
}

export async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError('Invalid JSON body', 400);
  }
}

export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Wraps a handler: OPTIONS, HttpError -> status, anything else -> 500 with a log line. */
export function serve(handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    const options = handleOptions(req);
    if (options) return options;
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) return error(err.message, err.status);
      console.error(err);
      // A missing secret is our configuration problem, not something to show a customer:
      // the name of the variable stays in the log, the client gets a sentence it can act on.
      if (err instanceof Error && err.message.startsWith('Missing environment variable')) {
        return error('This feature is not available yet. Please try again later.', 503);
      }
      return error(err instanceof Error ? err.message : 'Internal error', 500);
    }
  });
}

/** Retries a fetch-like call on 429/5xx or network errors with exponential backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = err instanceof RetryableError || !(err instanceof HttpError);
      if (!retryable || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw lastError;
}

export class RetryableError extends Error {}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
