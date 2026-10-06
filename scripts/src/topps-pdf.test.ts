import { describe, expect, it } from 'vitest';
import { buildCards, normalizePlayerName, parseChecklistText, toCsv, variationNameOf } from './topps-pdf.js';

const SAMPLE = `BASE

BASE CARDS I
          1 Jayson Tatum         Boston Celtics
          2 LeBRON James         Los Angeles Lakers
        115 Shai Gilgeous-Alexander Oklahoma City Thunder
        162 DeMAR DeROZAN        Sacramento Kings
        201 Cooper Flagg         Dallas Mavericks       Rookie
        228 Collin Murray-Boyles-Longname
            Toronto Raptors
        276 WE THE NORTH RAPTORS SHINE

BASE CARDS I GOLDEN MIRROR IMAGE VARIATION
          1 Jayson Tatum        Boston Celtics
          2 LeBron James        Los Angeles Lakers
        162 DeMar DeRozan       Sacramento Kings
        201 Cooper Flagg        Dallas Mavericks       Rookie
        999 Ghost Player        Utah Jazz

BASE CARDS I CLEAR VARIATION
          1 Jaylen Brown        Boston Celtics
          2 LeBron James        Phoenix Suns

INSERT
THE DAILY DRIBBLE
DD-1        LeBRON James               Los Angeles Lakers
CLASS OF 25
C25-9         Collin Murray-Boyles    Toronto Raptors           Rookie
FRO-Rk       Ryan Kalkbrenner      Charlotte Hornets        Rookie

AUTOGRAPH
FLAGSHIP REAL ONE AUTOGRAPHS
FRA-CF      Cooper Flagg               Dallas Mavericks       Rookie
`;

describe('normalizePlayerName', () => {
  it('fixes odd casing and keeps initials, accents and suffixes', () => {
    expect(normalizePlayerName('LeBRON James')).toBe('LeBron James');
    expect(normalizePlayerName('DeMAR DeROZAN')).toBe('DeMar DeRozan');
    expect(normalizePlayerName('P.J. Washington Jr.')).toBe('P.J. Washington Jr.');
    expect(normalizePlayerName('RJ Barrett')).toBe('RJ Barrett');
    expect(normalizePlayerName('Nikola Vučević')).toBe('Nikola Vučević');
    expect(normalizePlayerName('Shai Gilgeous-Alexander')).toBe('Shai Gilgeous-Alexander');
    expect(normalizePlayerName("D'Angelo Russell")).toBe("D'Angelo Russell");
    expect(normalizePlayerName('Tre Johnson III')).toBe('Tre Johnson III');
    expect(normalizePlayerName('Zach Lavine')).toBe('Zach Lavine');
  });
});

describe('variationNameOf', () => {
  it('maps section names to variation parallels', () => {
    expect(variationNameOf('BASE CARDS I')).toBeNull();
    expect(variationNameOf('COMBO CARDS')).toBeNull();
    expect(variationNameOf('BASE CARDS I GOLDEN MIRROR IMAGE VARIATION')).toBe('Golden Mirror Image Variation');
    expect(variationNameOf('BASE CARD VARIATIONS')).toBe('Image Variation');
    expect(variationNameOf('BASE PLAYER NUMBER VARIATION')).toBe('Player Number Variation');
    expect(variationNameOf('COMBO CARDS BLACKOUT VARIATION')).toBe('Blackout Variation');
  });
});

describe('parse + build', () => {
  const result = buildCards(parseChecklistText(SAMPLE));

  it('keeps base cards with variations as parallels, skips inserts and autographs', () => {
    expect(result.cards.map((c) => c.number)).toEqual(['1', '2', '115', '162', '201', '228']);
    expect(result.cards.find((c) => c.number === '228')!.team).toBe('Toronto Raptors');
    expect(result.anomalies.filter((a) => a.type === 'unparsable_row')).toEqual([]);
    const tatum = result.cards.find((c) => c.number === '1')!;
    expect(tatum.parallels).toEqual(['Base', 'Golden Mirror Image Variation']);
    expect(result.cards.find((c) => c.number === '201')!.rookie).toBe(true);
    expect(result.skippedSections.map((s) => s.section)).toEqual(['THE DAILY DRIBBLE', 'CLASS OF 25', 'FLAGSHIP REAL ONE AUTOGRAPHS']);
    expect(result.skippedSections.find((s) => s.section === 'CLASS OF 25')!.rows).toBe(2);
  });

  it('handles single-spaced rows through the team list', () => {
    const sga = result.cards.find((c) => c.number === '115')!;
    expect(sga.player).toBe('Shai Gilgeous-Alexander');
    expect(sga.team).toBe('Oklahoma City Thunder');
  });

  it('reports anomalies instead of guessing', () => {
    const types = result.anomalies.map((a) => a.type);
    expect(types).toContain('non_player_row'); // WE THE NORTH RAPTORS SHINE
    expect(types).toContain('variation_without_base'); // 999 Ghost Player
    expect(types).toContain('player_mismatch'); // #1 Jaylen Brown in Clear Variation
    expect(types).toContain('team_mismatch'); // #2 Phoenix Suns in Clear Variation
    expect(types).toContain('suspicious_name'); // LeBRON / DeMAR
    // Clear variation was not added to #1 (player mismatch) but was added to #2 (team mismatch keeps base team)
    expect(result.cards.find((c) => c.number === '1')!.parallels).not.toContain('Clear Variation');
    expect(result.cards.find((c) => c.number === '2')!.parallels).toContain('Clear Variation');
    expect(result.cards.find((c) => c.number === '2')!.team).toBe('Los Angeles Lakers');
  });

  it('writes our CSV format with numbered parallels appended', () => {
    const csv = toCsv(result.cards, { season: '2025-26', setSlug: '2025-26-topps-basketball', setName: 'Topps Basketball', numberedParallels: ['Gold/2025'] });
    expect(csv.split('\n')[0]).toBe('season,set_slug,set_name,card_number,player_name,team,is_rookie,parallels');
    expect(csv).toContain('2025-26,2025-26-topps-basketball,Topps Basketball,201,Cooper Flagg,Dallas Mavericks,true,Base|Golden Mirror Image Variation|Gold/2025');
  });
});
