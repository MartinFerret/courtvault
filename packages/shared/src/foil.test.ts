import { describe, expect, it } from 'vitest';
import { foilClass, foilTier } from './foil';

describe('foilTier', () => {
  it('leaves Base without a frame', () => {
    expect(foilTier('Base', null).tier).toBe('none');
    expect(foilClass(foilTier('Base', null))).toBe('');
  });
  it('gives unnumbered parallels a chrome frame', () => {
    expect(foilTier('Refractor', null).tier).toBe('chrome');
    expect(foilTier('Rainbow Foilboard', null).tier).toBe('chrome');
    expect(foilTier('Image Variation', null).tier).toBe('chrome');
  });
  it('reads the color word', () => {
    expect(foilTier('Gold Refractor', 50)).toEqual({ tier: 'color', hue: 44, saturation: 92 });
    expect(foilTier('Purple Rainbow', 250).hue).toBe(272);
    expect(foilTier('Negative Refractor', null).tier).toBe('chrome');
  });
  it('tiers by print run', () => {
    expect(foilTier('Red Refractor', 5).tier).toBe('short');
    expect(foilTier('Black Refractor', 10).tier).toBe('short');
    expect(foilTier('Gold', 2025).tier).toBe('color');
    expect(foilTier('Superfractor', 1).tier).toBe('one');
    expect(foilTier('FoilFractor', 1).tier).toBe('one');
    expect(foilClass(foilTier('Superfractor', 1))).toBe('cv-foil cv-foil--one');
  });
});
