import { describe, expect, it } from 'vitest';
import { BRAND_NAME, PRICING, formatUsd, yearlySavingsPercent } from './constants';

describe('pricing single source of truth', () => {
  it('holds the approved amounts', () => {
    expect(PRICING.monthlyUsd).toBe(5.99);
    expect(PRICING.yearlyUsd).toBe(49.99);
    expect(PRICING.trialDaysYearly).toBe(7);
    expect(PRICING.lifetimeUsd).toBe(149);
    expect(PRICING.products).toEqual({ monthly: 'premium_monthly', yearly: 'premium_yearly', lifetime: 'founders_lifetime' });
  });

  it('computes the yearly saving instead of hard-coding it', () => {
    expect(yearlySavingsPercent()).toBe(30);
    expect(yearlySavingsPercent({ monthlyUsd: 10, yearlyUsd: 120 })).toBe(0);
  });

  it('formats amounts the way the paywall shows them', () => {
    expect(formatUsd(5.99)).toBe('$5.99');
    expect(formatUsd(149)).toBe('$149');
  });

  it('spells the brand once', () => {
    expect(BRAND_NAME).toBe('Hoopfolio');
  });
});
