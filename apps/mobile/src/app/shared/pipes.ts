import { Pipe, type PipeTransform } from '@angular/core';
import {
  foilClass,
  foilTier,
  formatCents,
  formatCentsDelta,
  formatParallel,
  formatPercent,
  GRADE_LABELS,
  type Grade,
} from '@courtvault/shared';

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

/** Foil frame classes for a parallel tile (see tokens.scss .cv-foil-*). */
@Pipe({ name: 'foilClass' })
export class FoilClassPipe implements PipeTransform {
  transform(name: string | null | undefined, serialRun: number | null | undefined): string {
    return foilClass(foilTier(name ?? 'Base', serialRun));
  }
}

/** Hue of the foil frame, bound to the --foil-hue custom property. */
@Pipe({ name: 'foilHue' })
export class FoilHuePipe implements PipeTransform {
  transform(name: string | null | undefined, serialRun: number | null | undefined): string {
    const foil = foilTier(name ?? 'Base', serialRun);
    return `${foil.hue}`;
  }
}

@Pipe({ name: 'foilSat' })
export class FoilSatPipe implements PipeTransform {
  transform(name: string | null | undefined, serialRun: number | null | undefined): string {
    return `${foilTier(name ?? 'Base', serialRun).saturation}%`;
  }
}
