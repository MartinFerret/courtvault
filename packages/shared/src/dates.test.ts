import { describe, expect, it } from 'vitest';
import { formatEasternDay, nightLabel, previousEasternDay, toEasternDay } from './dates';

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

describe('nightLabel', () => {
  it('says last night only for the previous Eastern day', () => {
    // Friday 2026-10-09, 10:00 ET: Thursday is last night.
    expect(nightLabel('2026-10-08', new Date('2026-10-09T14:00:00Z'))).toEqual({
      label: 'Last night',
      isLastNight: true,
    });
  });
  it('says latest game night before the morning update or after an off day', () => {
    // Friday 2026-10-09, 03:50 ET, Thursday not processed yet: the page shows Wednesday.
    expect(nightLabel('2026-10-07', new Date('2026-10-09T07:50:00Z'))).toEqual({
      label: 'Latest game night',
      isLastNight: false,
    });
  });
});
