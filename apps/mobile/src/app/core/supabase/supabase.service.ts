import { Injectable, signal } from '@angular/core';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@courtvault/shared';
import { environment } from '../../../environments/environment';

/**
 * Single Supabase client for the app. Domain services use it; components never do.
 * The session is exposed as a signal so guards and screens react to sign-in/out.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient<Database>;
  readonly session = signal<Session | null>(null);
  readonly ready = signal(false);

  constructor() {
    this.client = createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    void this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.ready.set(true);
    });
    this.client.auth.onAuthStateChange((_event, session) => this.session.set(session));
  }

  get userId(): string | null {
    return this.session()?.user.id ?? null;
  }

  /** Calls an edge function with the user's session. Throws on non-2xx. */
  async invoke<T>(name: string, body: unknown): Promise<T> {
    const { data, error } = await this.client.functions.invoke<T>(name, { body: body as Record<string, unknown> });
    if (error) {
      // supabase-js hides the response body; read it for LIMIT_REACHED codes.
      const context = (error as { context?: Response }).context;
      let message = error.message;
      if (context && typeof context.text === 'function') {
        try {
          const text = await context.text();
          const parsed = JSON.parse(text) as { error?: string };
          if (parsed.error) message = parsed.error;
        } catch {
          /* keep the generic message */
        }
      }
      throw new Error(message);
    }
    return data as T;
  }
}
