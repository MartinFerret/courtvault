import { describe, expect, it } from 'vitest';
import { cardSlug, formatParallel, parseParallel, slugify } from './slug';

describe('slug helpers', () => {
  it('slugifies names with accents and punctuation', () => {
    expect(slugify('Luka Dončić')).toBe('luka-doncic');
    expect(slugify("Shai Gilgeous-Alexander")).toBe('shai-gilgeous-alexander');
    expect(cardSlug('2025-26-topps-chrome', '3', 'Cooper Flagg')).toBe('2025-26-topps-chrome-3-cooper-flagg');
  });
  it('parses and formats parallels', () => {
    expect(parseParallel('Gold Refractor/50')).toEqual({ name: 'Gold Refractor', serialRun: 50 });
    expect(parseParallel('Base')).toEqual({ name: 'Base', serialRun: null });
    expect(formatParallel('Superfractor', 1)).toBe('Superfractor 1/1');
    expect(formatParallel('Gold', 50)).toBe('Gold /50');
    expect(formatParallel('Base', null)).toBe('Base');
  });
});
