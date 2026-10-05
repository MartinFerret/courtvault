import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { Router } from '@angular/router';
import { SupabaseService } from '../supabase/supabase.service';

const ASKED_KEY = 'push.asked';

/**
 * Push notifications (FCM through Capacitor). Permission is requested after the first scan,
 * never at launch. The device token is saved to profiles.push_token (the only column a user
 * may update). Taps on a notification deep-link into the app through the `route` data field.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  readonly enabled = signal(false);

  async hasAsked(): Promise<boolean> {
    const { value } = await Preferences.get({ key: ASKED_KEY });
    return value === 'true';
  }

  /** Call once after the first successful scan. */
  async requestAfterFirstScan(): Promise<void> {
    if (await this.hasAsked()) return;
    await Preferences.set({ key: ASKED_KEY, value: 'true' });
    await this.register();
  }

  async register(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Browser: nothing to register; keep a fake token so the morning job can be tested.
      this.enabled.set(false);
      return;
    }
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;
    await PushNotifications.addListener('registration', async ({ value }) => {
      this.enabled.set(true);
      if (this.supabase.userId) {
        await this.supabase.client.from('profiles').update({ push_token: value }).eq('id', this.supabase.userId);
      }
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const route = (notification.data as { route?: string } | undefined)?.route;
      if (route) void this.router.navigateByUrl(route);
    });
    await PushNotifications.register();
  }

  async disable(): Promise<void> {
    if (this.supabase.userId) {
      await this.supabase.client.from('profiles').update({ push_token: null }).eq('id', this.supabase.userId);
    }
    this.enabled.set(false);
  }
}
