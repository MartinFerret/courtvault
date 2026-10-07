/**
 * Converts an official Topps checklist PDF (or its pdftotext output) into our CSV format
 * plus an anomalies report for manual review.
 *
 * Usage:
 *   pnpm convert:checklist <file.pdf|file.txt> --season 2025-26 --set-slug 2025-26-topps-chrome \
 *     --set-name "Topps Chrome" [--parallels data/checklists/parallels/2025-26-topps-chrome.json] [--out data/checklists]
 *
 * Needs `pdftotext` (poppler) for PDF input. With SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set,
 * players are matched against the database and the report lists new vs existing players.
 * The PDF is read locally and never copied anywhere.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { slugify, type Database } from '@courtvault/shared';
import { buildCards, parseChecklistText, stripSuffix, toCsv } from './topps-pdf.js';

loadEnv({ path: resolve(import.meta.dirname, '../.env') });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  const file = process.argv[2];
  const season = arg('season');
  const setSlug = arg('set-slug');
  const setName = arg('set-name');
  // Paths resolve from the repository root, wherever pnpm runs the script from.
  const root = resolve(import.meta.dirname, '../..');
  const outDir = resolve(root, arg('out') ?? 'data/checklists');
  if (!file || !season || !setSlug || !setName) {
    console.error(
      'Usage: convert-topps-pdf <file.pdf|file.txt> --season 2025-26 --set-slug <slug> --set-name "<name>" [--parallels <json>] [--out <dir>]',
    );
    process.exit(1);
  }

  const input = resolve(process.env['INIT_CWD'] ?? process.cwd(), file);
  const text = input.endsWith('.pdf')
    ? execFileSync('pdftotext', ['-layout', input, '-'], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
    : readFileSync(input, 'utf8');

  const parsed = parseChecklistText(text);
  const result = buildCards(parsed);

  // Some checklists (Hoops) carry no rookie marker. --rookies-from <csv> flags the players
  // already marked as rookies in another set of the same season; reported, never guessed.
  const rookiesFrom = arg('rookies-from');
  if (rookiesFrom && result.cards.every((c) => !c.rookie)) {
    const known = new Set(
      readFileSync(resolve(process.env['INIT_CWD'] ?? process.cwd(), rookiesFrom), 'utf8')
        .split(/\r?\n/)
        .slice(1)
        .map((l) => l.split(','))
        .filter((c) => c[6] === 'true')
        .map((c) => slugify(stripSuffix(c[4] ?? ''))),
    );
    let flagged = 0;
    for (const c of result.cards) {
      if (known.has(slugify(stripSuffix(c.player)))) {
        c.rookie = true;
        flagged++;
      }
    }
    result.anomalies.push({
      type: 'rookies_inferred',
      section: '',
      line: 0,
      message: `${flagged} rookie flags inferred from ${rookiesFrom} (no rookie marker in this PDF)`,
    });
  }

  let numberedParallels: string[] = [];
  const parallelsFile = arg('parallels') ?? resolve(outDir, 'parallels', `${setSlug}.json`);
  if (existsSync(parallelsFile)) {
    const json = JSON.parse(readFileSync(parallelsFile, 'utf8')) as { parallels?: string[] };
    numberedParallels = json.parallels ?? [];
  }

  // Optional player matching against the database
  const matching: string[] = [];
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (url && key) {
    const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
    const { data: players, error } = await supabase.from('players').select('slug, name');
    if (error) throw error;
    const bySlug = new Map(players.map((p) => [p.slug, p.name]));
    const byStripped = new Map(players.map((p) => [slugify(stripSuffix(p.name)), p.name]));
    let existing = 0;
    const fresh: string[] = [];
    const near: string[] = [];
    for (const name of new Set(result.cards.map((c) => c.player))) {
      const slug = slugify(name);
      if (bySlug.has(slug)) existing++;
      else if (byStripped.has(slugify(stripSuffix(name))))
        near.push(`"${name}" ~ existing "${byStripped.get(slugify(stripSuffix(name)))}"`);
      else fresh.push(name);
    }
    matching.push(`Existing players matched: ${existing}`, `New players: ${fresh.length}`);
    if (near.length)
      matching.push(
        `Possible duplicates (suffix differs, review before import):`,
        ...near.map((n) => `- ${n}`),
      );
  } else {
    matching.push(
      'Player matching skipped (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to compare with the database).',
    );
  }

  mkdirSync(outDir, { recursive: true });
  const csvPath = resolve(outDir, `${setSlug}.csv`);
  writeFileSync(csvPath, toCsv(result.cards, { season, setSlug, setName, numberedParallels }));

  const byType = new Map<string, number>();
  for (const a of result.anomalies) byType.set(a.type, (byType.get(a.type) ?? 0) + 1);
  const unverified = [
    ...new Set(
      result.anomalies
        .filter((a) => a.type === 'player_mismatch' && a.number)
        .map((a) => a.number!),
    ),
  ].sort((a, b) => Number(a) - Number(b));
  const report = [
    `# Anomalies report: ${season} ${setName}`,
    '',
    `Source: official Topps checklist (local file, not stored). Generated ${new Date().toISOString().slice(0, 10)}.`,
    '',
    '## Summary',
    '',
    `- Cards written: ${result.cards.length} (rookies: ${result.cards.filter((c) => c.rookie).length})`,
    `- Base sections: ${result.stats.baseSections}, variation sections: ${result.stats.variationSections}, rows read: ${result.stats.rows}`,
    `- Variation parallels found: ${[...new Set(result.cards.flatMap((c) => c.parallels.filter((p) => p !== 'Base')))].join(', ') || 'none'}`,
    `- Numbered parallels applied: ${numberedParallels.length ? numberedParallels.join(', ') : 'NONE (add ' + parallelsFile + ')'}`,
    ...matching.map((m) => `- ${m}`),
    '',
    '## Unverified cards',
    '',
    'The base section is the source of truth. These numbers have a different player in at least one',
    'variation section; verify with a real card photo before trusting them:',
    '',
    ...(unverified.length
      ? unverified.map(
          (n) =>
            `- #${n}: ${result.cards.find((c) => c.number === n)?.player ?? '?'} (base) — UNVERIFIED`,
        )
      : ['- none']),
    '',
    '## Rules applied',
    '',
    '- Teams: the base section wins when a variation section disagrees. The team printed on a card is',
    '  catalog information only; stats and "Last night" match on player identity, never on the team.',
    '- Team cards and other rows without a player (e.g. "WE THE NORTH RAPTORS SHINE") are skipped for the MVP.',
    '- Known team misspellings (e.g. "Portland Trailblazers") are normalized automatically and listed as team_alias.',
    '',
    '## Anomalies by type',
    '',
    ...[...byType.entries()].map(([t, n]) => `- ${t}: ${n}`),
    '',
    '## Details',
    '',
    ...result.anomalies.map(
      (a) => `- [${a.type}] ${a.section ? `(${a.section}, line ${a.line}) ` : ''}${a.message}`,
    ),
    '',
    '## Skipped sections (out of MVP scope)',
    '',
    ...result.skippedSections.map((s) => `- ${s.group} / ${s.section}: ${s.rows} rows`),
    '',
  ].join('\n');
  const reportPath = resolve(outDir, `${setSlug}.anomalies.md`);
  writeFileSync(reportPath, report);

  console.log(`${result.cards.length} cards -> ${csvPath}`);
  console.log(`${result.anomalies.length} anomalies -> ${reportPath}`);
  for (const [t, n] of byType) console.log(`  ${t}: ${n}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
