import { describe, expect, it } from 'vitest';
import { formatEasternDay, previousEasternDay, toEasternDay } from './dates';

describe('eastern day helpers', () => {
  it('uses the New York calendar day', () => {
    const lateNightUtc = new Date('2026-10-05T03:30:00Z'); // 23:30 on Oct 4 in New York
    expect(toEasternDay(lateNightUtc)).toBe('2026-10-04');
    expect(previousEasternDay(lateNightUtc)).toBe('2026-10-03');
  });
  it('formats a day', () => {
    expect(formatEasternDay('2026-10-04')).toBe('Sun, Oct 4');
  });
});
