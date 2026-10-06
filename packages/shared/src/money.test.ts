import { describe, expect, it } from 'vitest';
import { dollarsToCents, formatCents, formatCentsDelta, formatPercent, percentChange } from './money';

describe('money helpers', () => {
  it('formats cents as US dollars', () => {
    expect(formatCents(123456)).toBe('$1,234.56');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(null)).toBe('—');
  });
  it('formats signed deltas', () => {
    expect(formatCentsDelta(1250)).toBe('+$12.50');
    expect(formatCentsDelta(-300)).toBe('-$3.00');
    expect(formatCentsDelta(0)).toBe('$0.00');
  });
  it('computes percent change', () => {
    expect(percentChange(1000, 1080)).toBe(8);
    expect(percentChange(0, 100)).toBeNull();
    expect(formatPercent(8)).toBe('+8.0%');
  });
  it('converts dollars to integer cents', () => {
    expect(dollarsToCents('12.345')).toBe(1235);
    expect(() => dollarsToCents('abc')).toThrow();
  });
});
