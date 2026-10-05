import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { HttpError } from './http.ts';
import { requireEnv } from './env.ts';

// Edge functions do not share the generated Database types with the apps (they are bundled
// separately). Calls are typed loosely here and the SQL contract is tested with pgTAP.
// deno-lint-ignore no-explicit-any
export type ServiceClient = SupabaseClient<any, 'public', any>;

/** Service-role client: bypasses RLS. Only for jobs, webhooks and account deletion. */
export function serviceClient(): ServiceClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client acting as the caller: RLS applies. Throws 401 without a valid user session. */
export async function userClient(req: Request): Promise<{ client: ServiceClient; user: User }> {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError('Missing Authorization header', 401);
  const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError('Invalid or expired session', 401);
  return { client, user: data.user };
}
