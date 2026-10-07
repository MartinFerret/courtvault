import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonText,
} from '@ionic/angular';
import { AFFILIATION_DISCLAIMER, BRAND_NAME, BRAND_TAGLINE } from '@courtvault/shared';
import { AuthService, type SocialProvider } from '../../core/auth/auth.service';

type Mode = 'sign-up' | 'sign-in';

/**
 * One screen for sign-up and sign-in: the methods are the same (Google, Apple, email code),
 * only the wording and the optional marketing checkbox change. No passwords, no mandatory
 * terms checkbox: continuing means accepting the terms (link under the buttons).
 */
@Component({
  selector: 'cv-sign-in',
  imports: [
    FormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonIcon,
    IonCheckbox,
  ],
  templateUrl: './sign-in.page.html',
})
export class SignInPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly disclaimer = AFFILIATION_DISCLAIMER;
  readonly brand = BRAND_NAME;
  readonly tagline = BRAND_TAGLINE;

  email = '';
  code = '';
  marketingConsent = false;
  readonly mode = signal<Mode>('sign-up');
  readonly step = signal<'email' | 'code'>('email');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  toggleMode(): void {
    this.mode.set(this.mode() === 'sign-up' ? 'sign-in' : 'sign-up');
    this.error.set(null);
  }

  labelFor(provider: SocialProvider): string {
    return provider === 'apple' ? 'Continue with Apple' : 'Continue with Google';
  }

  async sendCode(): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.auth.setPendingMarketingConsent(
        this.mode() === 'sign-up' && this.marketingConsent,
      );
      await this.auth.requestEmailCode(this.email.trim());
      this.step.set('code');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not send the code.');
    } finally {
      this.busy.set(false);
    }
  }

  async verify(): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.auth.verifyEmailCode(this.email.trim(), this.code.trim());
      await this.router.navigate(['/onboarding/players']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      this.busy.set(false);
    }
  }

  async social(provider: SocialProvider): Promise<void> {
    this.error.set(null);
    try {
      await this.auth.setPendingMarketingConsent(
        this.mode() === 'sign-up' && this.marketingConsent,
      );
      await this.auth.signInWith(provider);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  }
}
