import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonInput, IonItem, IonNote, IonText } from '@ionic/angular';
import { AFFILIATION_DISCLAIMER } from '@courtvault/shared';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'cv-sign-in',
  imports: [FormsModule, IonContent, IonItem, IonInput, IonButton, IonNote, IonText],
  templateUrl: './sign-in.page.html',
})
export class SignInPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly disclaimer = AFFILIATION_DISCLAIMER;

  email = '';
  code = '';
  readonly step = signal<'email' | 'code'>('email');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async sendCode(): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
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

  async social(provider: 'apple' | 'google'): Promise<void> {
    this.error.set(null);
    try {
      await (provider === 'apple' ? this.auth.signInWithApple() : this.auth.signInWithGoogle());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  }
}
