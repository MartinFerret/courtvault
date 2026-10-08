import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.hoopticker.mobile',
  appName: 'HoopTicker',
  webDir: 'dist/mobile/browser',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Local development only: the app (https://localhost) calls Supabase over http on the host.
    // Off by default (store builds); `CAP_ALLOW_MIXED_CONTENT=true npx cap sync android` for
    // the emulator against the local Supabase stack.
    allowMixedContent: process.env['CAP_ALLOW_MIXED_CONTENT'] === 'true',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
