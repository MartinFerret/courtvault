import { Injectable, computed, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { APP_SCHEME } from '@courtvault/shared';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Supabase Auth: email one-time code (works everywhere), Sign in with Apple and Google
 * (wired, enabled only when the provider keys are configured in Supabase).
 *
 * Store checklist: Sign in with Apple must be enabled in Supabase and Apple Developer before
 * App Store submission, because Google sign-in is offered on iOS.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly user = computed(() => this.supabase.session()?.user ?? null);
  readonly isSignedIn = computed(() => !!this.supabase.session());
  readonly ready = this.supabase.ready;

  /** Social sign-in is shown only when configured. Apple is iOS-only by Apple's rules. */
  readonly googleEnabled = !!environment.googleWebClientId;
  readonly appleEnabled = Capacitor.getPlatform() === 'ios' && !!environment.googleWebClientId;

  async requestEmailCode(email: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async verifyEmailCode(email: string, token: string): Promise<void> {
    const { error } = await this.supabase.client.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
  }

  async signInWithApple(): Promise<void> {
    // Native flow: @capacitor-community/apple-sign-in -> signInWithIdToken. Browser: OAuth redirect.
    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: this.redirectTo() },
    });
    if (error) throw error;
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: this.redirectTo() },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
  }

  private redirectTo(): string {
    return Capacitor.isNativePlatform() ? `${APP_SCHEME}auth/callback` : `${location.origin}/auth/callback`;
  }
}
