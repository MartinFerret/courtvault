import { Pipe, type PipeTransform } from '@angular/core';
import { formatCents, formatCentsDelta, formatParallel, formatPercent, GRADE_LABELS, type Grade } from '@courtvault/shared';

@Pipe({ name: 'cents' })
export class CentsPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatCents(value);
  }
}

@Pipe({ name: 'delta' })
export class DeltaPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatCentsDelta(value);
  }
}

@Pipe({ name: 'percent' })
export class PercentPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatPercent(value);
  }
}

@Pipe({ name: 'parallel' })
export class ParallelPipe implements PipeTransform {
  transform(name: string, serialRun: number | null): string {
    return formatParallel(name, serialRun);
  }
}

@Pipe({ name: 'grade' })
export class GradePipe implements PipeTransform {
  transform(value: Grade | string): string {
    return GRADE_LABELS[value as Grade] ?? value;
  }
}
