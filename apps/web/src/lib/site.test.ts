import { describe, expect, it } from 'vitest';
import {
  HOME_KEYWORD,
  HOME_PROMISE,
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  pendingRobots,
  seoTitle,
  siteUrl,
} from './site';

describe('site helpers', () => {
  it('builds absolute urls without double slashes', () => {
    expect(absoluteUrl('/cards/x')).toBe(`${siteUrl()}/cards/x`);
    expect(absoluteUrl('cards/x')).toBe(`${siteUrl()}/cards/x`);
  });
});

describe('homepage SEO (R27, R33, R37)', () => {
  it('keeps the title at about 60 characters with the brand suffix', () => {
    expect(`${seoTitle(HOME_KEYWORD, HOME_PROMISE)} | ${SITE_NAME}`.length).toBeLessThanOrEqual(60);
  });
  it('keeps the description under 155 characters', () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(155);
  });
  it('starts the title with the keyword', () => {
    expect(seoTitle(HOME_KEYWORD, HOME_PROMISE).startsWith(HOME_KEYWORD)).toBe(true);
  });
  it('marks pending pages noindex until the slugs are frozen', () => {
    expect(pendingRobots()).toEqual({ robots: { index: false, follow: true } });
  });
});
