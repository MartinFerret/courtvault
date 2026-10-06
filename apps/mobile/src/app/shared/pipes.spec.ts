import { describe, expect, it } from 'vitest';
import { CentsPipe, DeltaPipe, GradePipe, ParallelPipe } from './pipes';

describe('pipes', () => {
  it('format values for templates', () => {
    expect(new CentsPipe().transform(4200)).toBe('$42.00');
    expect(new DeltaPipe().transform(-150)).toBe('-$1.50');
    expect(new ParallelPipe().transform('Gold Refractor', 50)).toBe('Gold Refractor /50');
    expect(new GradePipe().transform('PSA10')).toBe('PSA 10');
  });
});
