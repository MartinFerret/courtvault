import { Injectable, computed, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { APP_SCHEME } from '@courtvault/shared';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';

export type SocialProvider = 'apple' | 'google';
export type SignUpPlatform = 'web' | 'ios' | 'android';

const PENDING_CONSENT_KEY = 'signup.marketingConsent';

/**
 * Supabase Auth: email one-time code (works everywhere), Sign in with Apple and Google
 * (wired, shown only when the provider is configured). No passwords.
 *
 * Store checklist: Sign in with Apple must be enabled in Supabase and Apple Developer before
 * App Store submission, because Google sign-in is offered on iOS. Apple must be as prominent
 * as Google: both are full-width buttons, Apple first on iOS, Google first elsewhere.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly user = computed(() => this.supabase.session()?.user ?? null);
  readonly isSignedIn = computed(() => !!this.supabase.session());
  readonly ready = this.supabase.ready;

  readonly platform: SignUpPlatform =
    Capacitor.getPlatform() === 'ios'
      ? 'ios'
      : Capacitor.getPlatform() === 'android'
        ? 'android'
        : 'web';
  readonly googleEnabled = !!environment.googleWebClientId;
  readonly appleEnabled = environment.appleSignInEnabled;

  /** Social buttons in display order: Apple first on iOS, Google first on the web and Android. */
  readonly socialProviders: SocialProvider[] = (this.platform === 'ios'
    ? ['apple', 'google']
    : ['google', 'apple']
  ).filter((p) => (p === 'apple' ? this.appleEnabled : this.googleEnabled)) as SocialProvider[];

  constructor() {
    // The optional marketing checkbox is ticked before the account exists (OAuth redirects,
    // email codes): the choice waits in local storage and lands on the profile once signed in.
    this.supabase.client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void this.applyPendingConsent();
    });
  }

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

  async signInWith(provider: SocialProvider): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: this.redirectTo() },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
  }

  /** Remembers the unchecked-by-default marketing consent until the session exists. */
  async setPendingMarketingConsent(consented: boolean): Promise<void> {
    if (consented) await Preferences.set({ key: PENDING_CONSENT_KEY, value: 'true' });
    else await Preferences.remove({ key: PENDING_CONSENT_KEY });
  }

  async applyPendingConsent(): Promise<void> {
    const { value } = await Preferences.get({ key: PENDING_CONSENT_KEY });
    const userId = this.supabase.userId;
    if (value !== 'true' || !userId) return;
    await Preferences.remove({ key: PENDING_CONSENT_KEY });
    await this.supabase.client
      .from('profiles')
      .update({
        marketing_consent_at: new Date().toISOString(),
        marketing_consent_source: this.platform,
      })
      .eq('id', userId)
      .is('marketing_consent_at', null);
  }

  private redirectTo(): string {
    return Capacitor.isNativePlatform()
      ? `${APP_SCHEME}auth/callback`
      : `${location.origin}/auth/callback`;
  }
}
