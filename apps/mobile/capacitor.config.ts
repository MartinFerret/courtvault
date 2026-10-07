import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.hoopfolio.mobile',
  appName: 'Hoopfolio',
  webDir: 'dist/mobile/browser',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Local development only: the app (https://localhost) calls Supabase over http on the host.
    // Set to false for production builds.
    allowMixedContent: true,
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
