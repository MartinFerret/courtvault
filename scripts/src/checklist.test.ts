import { describe, expect, it } from 'vitest';
import { parseChecklistCsv } from './checklist.js';

const HEADER = 'season,set_slug,set_name,card_number,player_name,team,is_rookie,parallels\n';

describe('parseChecklistCsv', () => {
  it('parses a valid row with serial runs', () => {
    const rows = parseChecklistCsv(
      HEADER +
        '2025-26,2025-26-topps-chrome,Topps Chrome,3,Cooper Flagg,Dallas Mavericks,true,Base|Refractor|Gold Refractor/50|Superfractor/1\n',
    );
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.playerSlug).toBe('cooper-flagg');
    expect(row.cardSlug).toBe('2025-26-topps-chrome-3-cooper-flagg');
    expect(row.isRookie).toBe(true);
    expect(row.parallels).toEqual([
      { name: 'Base', serialRun: null },
      { name: 'Refractor', serialRun: null },
      { name: 'Gold Refractor', serialRun: 50 },
      { name: 'Superfractor', serialRun: 1 },
    ]);
  });

  it('accepts an empty team and accented names', () => {
    const rows = parseChecklistCsv(HEADER + '2026-27,2026-27-topps-basketball,Topps Basketball,77,Luka Dončić,,false,Base\n');
    expect(rows[0]!.team).toBeNull();
    expect(rows[0]!.playerSlug).toBe('luka-doncic');
  });

  it('rejects a bad season', () => {
    expect(() => parseChecklistCsv(HEADER + '2025,2025-26-topps-chrome,Topps Chrome,3,Cooper Flagg,,true,Base\n')).toThrow(
      /invalid season/,
    );
  });

  it('rejects a missing column', () => {
    expect(() => parseChecklistCsv('season,set_slug\n2025-26,x\n')).toThrow(/Missing column/);
  });

  it('rejects duplicate parallels', () => {
    expect(() => parseChecklistCsv(HEADER + '2025-26,2025-26-topps-chrome,Topps Chrome,3,Cooper Flagg,,true,Base|Base\n')).toThrow(
      /duplicate parallel/,
    );
  });
});
