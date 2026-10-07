import { describe, expect, it } from 'vitest';
import { normalizeSeason, parseGrade, parsePrice, parseSerial } from './import.service';

describe('import parsing', () => {
  it('reads grades the way collectors write them', () => {
    expect(parseGrade('PSA 10')).toBe('PSA10');
    expect(parseGrade('psa10')).toBe('PSA10');
    expect(parseGrade('PSA 9')).toBe('PSA9');
    expect(parseGrade('Raw')).toBe('RAW');
    expect(parseGrade('BGS 9.5')).toBe('RAW');
    expect(parseGrade('')).toBe('RAW');
  });
  it('reads serial numbers from "12/50"', () => {
    expect(parseSerial('12/50')).toBe(12);
    expect(parseSerial('Gold Refractor 3 / 50')).toBe(3);
    expect(parseSerial('Base')).toBeNull();
  });
  it('reads prices to cents', () => {
    expect(parsePrice('$12.50')).toBe(1250);
    expect(parsePrice('12,5')).toBe(1250);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });
  it('normalizes seasons', () => {
    expect(normalizeSeason('2025-26')).toBe('2025-26');
    expect(normalizeSeason('2025-2026')).toBe('2025-26');
    expect(normalizeSeason('25/26')).toBe('2025-26');
    expect(normalizeSeason('2025')).toBe('2025-26');
    expect(normalizeSeason('')).toBe('');
  });
});
