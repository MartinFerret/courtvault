import { describe, expect, it } from 'vitest';
import { absoluteUrl, siteUrl } from './site';

describe('site helpers', () => {
  it('builds absolute urls without double slashes', () => {
    expect(absoluteUrl('/cards/x')).toBe(`${siteUrl()}/cards/x`);
    expect(absoluteUrl('cards/x')).toBe(`${siteUrl()}/cards/x`);
  });
});
