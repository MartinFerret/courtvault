import { APP_BUNDLE_ID, APP_LINK_PATHS } from '@courtvault/shared';

/**
 * Association files for Universal Links (iOS) and App Links (Android), served at
 * /.well-known/apple-app-site-association and /.well-known/assetlinks.json (rewrites in
 * next.config.ts). Both stay 404 until the store accounts exist: APPLE_TEAM_ID (Apple Developer
 * membership) and ANDROID_SHA256_FINGERPRINTS (upload key and Play App Signing key,
 * comma-separated, "AB:CD:..." form) in the Netlify environment.
 */
export function appleTeamId(): string | null {
  const id = process.env['APPLE_TEAM_ID']?.trim();
  return id && /^[A-Z0-9]{10}$/.test(id) ? id : null;
}

export function androidFingerprints(): string[] {
  return (process.env['ANDROID_SHA256_FINGERPRINTS'] ?? '')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
}

export function appleAppSiteAssociation(teamId: string) {
  const appId = `${teamId}.${APP_BUNDLE_ID}`;
  return {
    applinks: {
      details: [{ appIDs: [appId], components: APP_LINK_PATHS.map((path) => ({ '/': path })) }],
    },
    webcredentials: { apps: [appId] },
  };
}

export function assetLinks(fingerprints: string[]) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: APP_BUNDLE_ID,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
