import { afterEach, describe, expect, it } from 'vitest';
import { androidFingerprints, appleAppSiteAssociation, appleTeamId, assetLinks } from './app-links';

const FP = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0')).join(':');

describe('app links', () => {
  afterEach(() => {
    delete process.env['APPLE_TEAM_ID'];
    delete process.env['ANDROID_SHA256_FINGERPRINTS'];
  });

  it('stays off until the keys are valid', () => {
    expect(appleTeamId()).toBeNull();
    expect(androidFingerprints()).toEqual([]);
    process.env['APPLE_TEAM_ID'] = 'short';
    process.env['ANDROID_SHA256_FINGERPRINTS'] = 'not-a-fingerprint';
    expect(appleTeamId()).toBeNull();
    expect(androidFingerprints()).toEqual([]);
  });

  it('builds the apple file with the bundle id and the website paths', () => {
    process.env['APPLE_TEAM_ID'] = 'ABCDE12345';
    const file = appleAppSiteAssociation(appleTeamId()!);
    expect(file.applinks.details[0]!.appIDs).toEqual(['ABCDE12345.app.hoopticker.mobile']);
    expect(file.applinks.details[0]!.components).toContainEqual({ '/': '/cards/*' });
  });

  it('builds the android file from comma-separated fingerprints, normalized', () => {
    process.env['ANDROID_SHA256_FINGERPRINTS'] = ` ${FP} , ${FP.toUpperCase()}`;
    const fps = androidFingerprints();
    expect(fps).toEqual([FP.toUpperCase(), FP.toUpperCase()]);
    expect(assetLinks(fps)[0]!.target.package_name).toBe('app.hoopticker.mobile');
  });
});
