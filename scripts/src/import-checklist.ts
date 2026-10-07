/**
 * Imports a Topps checklist CSV into the catalog. Idempotent: re-running creates no duplicates.
 *
 * Usage: pnpm import:checklist data/checklists/DEMO-2025-26-topps-chrome.csv [more.csv ...]
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (scripts/.env or the environment).
 *
 * Player identity: names go through resolve_player_names() (exact key, alias, or a single close
 * existing player) so a Topps typo never creates a second player silently. Known variants live
 * in data/checklists/player-aliases.csv (alias -> canonical name), applied before and after the
 * import (merging an existing duplicate when needed). Everything that is not an exact match is
 * written to the set's *.anomalies.md under an "Import" section for review.
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@courtvault/shared';
import { execFileSync } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import { parseChecklistCsv, type ChecklistRow } from './checklist.js';

loadEnv({ path: resolve(import.meta.dirname, '../.env') });
// `pnpm db:reset` sets SUPABASE_LOCAL=1: always target the local stack, whatever scripts/.env says.
if (process.env['SUPABASE_LOCAL']) {
  process.env['SUPABASE_URL'] = 'http://127.0.0.1:54321';
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = localServiceRoleKey();
}

/** Service role key of the running local Supabase (same on every machine, printed by `supabase status`). */
function localServiceRoleKey(): string {
  const out = execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' });
  const key = /^SERVICE_ROLE_KEY="?([^"\n]+)"?$/m.exec(out)?.[1];
  if (!key)
    throw new Error('Local Supabase is not running (supabase status found no SERVICE_ROLE_KEY).');
  return key;
}

async function main(): Promise<void> {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: pnpm import:checklist <file.csv> [...]');
    process.exit(1);
  }
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) {
    console.error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see scripts/.env.example).',
    );
    process.exit(1);
  }
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });

  // pnpm runs workspace scripts from scripts/; INIT_CWD is where the user typed the command.
  const baseDir = process.env['INIT_CWD'] ?? process.cwd();
  const aliasFile = resolve(dirname(resolve(baseDir, files[0]!)), 'player-aliases.csv');
  const aliases = loadAliases(aliasFile);
  await applyAliases(supabase, aliases, aliasFile);
  for (const file of files) {
    const path = resolve(baseDir, file);
    const rows = parseChecklistCsv(readFileSync(path, 'utf8'));
    console.log(`${file}: ${rows.length} cards`);
    const stats = await importRows(supabase, rows, file);
    console.log(
      `  sets ${stats.sets}, players ${stats.players} (${stats.merged} merged into existing, ${stats.created} new), cards ${stats.cards}, parallels ${stats.parallels}`,
    );
    if (stats.report.length > 0) {
      const reportPath = resolve(
        dirname(path),
        `${basename(file).replace(/\.csv$/, '')}.anomalies.md`,
      );
      writeImportReport(reportPath, file, stats.report);
      console.log(`  ${stats.report.length} player notes -> ${reportPath}`);
    }
  }
  await applyAliases(supabase, aliases, aliasFile);
  // Public URL slugs (website) derive from the imported rows.
  const { error: slugError } = await supabase.rpc('refresh_public_slugs');
  if (slugError) throw slugError;
}

type Client = SupabaseClient<Database>;
type Alias = { alias: string; canonical: string };

function loadAliases(file: string): Alias[] {
  if (!existsSync(file)) return [];
  const rows = parse(readFileSync(file, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
  return rows
    .map((r) => ({ alias: r['alias'] ?? '', canonical: r['canonical'] ?? '' }))
    .filter((r) => r.alias && r.canonical);
}

/** Same spelling once punctuation, casing and diacritics are gone (mirrors public.player_key). */
function playerKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Makes the alias file true in the database: the canonical name exists (renaming a player that
 * only exists under the alias spelling), a separate player under the alias is merged into it,
 * and the alias is recorded so the resolver matches it next time.
 */
async function applyAliases(supabase: Client, aliases: Alias[], source: string) {
  if (aliases.length === 0) return;
  const { data: players, error } = await supabase.from('players').select('id, name, slug');
  if (error) throw error;
  const byKey = new Map(players.map((p) => [playerKey(p.name), p]));
  for (const { alias, canonical } of aliases) {
    const aliasKey = playerKey(alias);
    const canonicalKey = playerKey(canonical);
    const aliasPlayer = byKey.get(aliasKey);
    const canonicalPlayer = byKey.get(canonicalKey);
    if (aliasKey === canonicalKey) {
      // Casing or punctuation only: one player, the canonical spelling wins.
      if (aliasPlayer && aliasPlayer.name !== canonical) {
        const { error: renameError } = await supabase
          .from('players')
          .update({ name: canonical })
          .eq('id', aliasPlayer.id);
        if (renameError) throw renameError;
        console.log(`  renamed "${aliasPlayer.name}" -> "${canonical}"`);
        aliasPlayer.name = canonical;
      }
      continue;
    }
    if (!canonicalPlayer) continue; // nothing to attach to yet (checked again after the import)
    if (aliasPlayer && aliasPlayer.id !== canonicalPlayer.id) {
      const { error: mergeError } = await supabase.rpc('merge_players', {
        p_duplicate: aliasPlayer.id,
        p_canonical: canonicalPlayer.id,
        p_source: basename(source),
      });
      if (mergeError) throw mergeError;
      console.log(`  merged "${aliasPlayer.name}" into "${canonicalPlayer.name}"`);
      byKey.delete(aliasKey);
    } else {
      const { error: aliasError } = await supabase
        .from('player_aliases')
        .upsert(
          { alias_key: aliasKey, alias, player_id: canonicalPlayer.id, source: basename(source) },
          { onConflict: 'alias_key' },
        );
      if (aliasError) throw aliasError;
    }
  }
}

/** Rewrites the "Import" section of the set's anomalies report (idempotent across re-imports). */
function writeImportReport(reportPath: string, file: string, lines: string[]) {
  const header = `## Import (${basename(file)})`;
  const created = lines.filter((l) => l.startsWith('- new:')).map((l) => l.slice(7));
  const section = [
    header,
    '',
    `Last run ${new Date().toISOString().slice(0, 10)}. Player names that were not an exact match of an`,
    'existing player. "merged" rows were attached to the existing player and recorded as aliases;',
    '"suffix" and "ambiguous" rows created a player to confirm; "new" names were not close to any',
    'existing player. Add a typo to player-aliases.csv once it is confirmed to be a known player.',
    '',
    ...lines.filter((l) => !l.startsWith('- new:')),
    ...(created.length > 0 ? [`- new (${created.length}): ${created.join(', ')}`] : []),
    '',
  ].join('\n');
  const existing = existsSync(reportPath)
    ? readFileSync(reportPath, 'utf8')
    : `# Anomalies report: ${basename(file)}\n`;
  const start = existing.indexOf(header);
  const base =
    start === -1
      ? existing.replace(/\s*$/, '\n')
      : existing.slice(0, start).replace(/\s*$/, '\n') +
        (existing.indexOf('\n## ', start + header.length) === -1
          ? ''
          : existing.slice(existing.indexOf('\n## ', start + header.length) + 1));
  writeFileSync(reportPath, `${base}\n${section}`);
}

async function importRows(supabase: Client, rows: ChecklistRow[], file: string) {
  const stats = {
    sets: 0,
    players: 0,
    merged: 0,
    created: 0,
    cards: 0,
    parallels: 0,
    report: [] as string[],
  };

  // Sets
  const setsBySlug = new Map(rows.map((r) => [r.setSlug, r]));
  const { data: sets, error: setsError } = await supabase
    .from('card_sets')
    .upsert(
      [...setsBySlug.values()].map((r) => ({ slug: r.setSlug, name: r.setName, season: r.season })),
      { onConflict: 'slug' },
    )
    .select('id, slug');
  if (setsError) throw setsError;
  const setIdBySlug = new Map(sets.map((s) => [s.slug, s.id]));
  stats.sets = sets.length;

  // Players: resolve every name against the catalog first, create only what is really new.
  const playersBySlug = new Map(rows.map((r) => [r.playerSlug, r]));
  const names = [...new Set([...playersBySlug.values()].map((r) => r.playerName))];
  const { data: resolved, error: resolveError } = await supabase.rpc('resolve_player_names', {
    p_names: names,
  });
  if (resolveError) throw resolveError;
  const byName = new Map(resolved.map((r) => [r.name, r]));
  const playerIdBySlug = new Map<string, string>();
  const toCreate: ChecklistRow[] = [];
  for (const r of playersBySlug.values()) {
    const match = byName.get(r.playerName);
    if (match && match.player_id && (match.status === 'exact' || match.status === 'merge')) {
      playerIdBySlug.set(r.playerSlug, match.player_id);
      if (match.status === 'merge') {
        stats.merged++;
        stats.report.push(`- merged: "${r.playerName}" -> "${match.player_name}" (${match.note})`);
        const { error: aliasError } = await supabase.from('player_aliases').upsert(
          {
            alias_key: playerKey(r.playerName),
            alias: r.playerName,
            player_id: match.player_id,
            source: basename(file),
          },
          { onConflict: 'alias_key' },
        );
        if (aliasError) throw aliasError;
      }
    } else {
      toCreate.push(r);
      stats.created++;
      const status = match?.status ?? 'new';
      stats.report.push(
        `- ${status}: "${r.playerName}"${match?.note ? ` (near ${match.note})` : ''}`,
      );
    }
  }
  if (toCreate.length > 0) {
    const { data: players, error: playersError } = await supabase
      .from('players')
      .upsert(
        toCreate.map((r) => ({ slug: r.playerSlug, name: r.playerName, team: r.team })),
        { onConflict: 'slug' },
      )
      .select('id, slug');
    if (playersError) throw playersError;
    for (const p of players) playerIdBySlug.set(p.slug, p.id);
  }
  stats.players = playerIdBySlug.size;

  // Cards
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .upsert(
      rows.map((r) => ({
        slug: r.cardSlug,
        set_id: must(setIdBySlug.get(r.setSlug), `set ${r.setSlug}`),
        player_id: must(playerIdBySlug.get(r.playerSlug), `player ${r.playerSlug}`),
        number: r.cardNumber,
        is_rookie: r.isRookie,
      })),
      { onConflict: 'set_id,number' },
    )
    .select('id, set_id, number');
  if (cardsError) throw cardsError;
  const cardIdByKey = new Map(cards.map((c) => [`${c.set_id}:${c.number}`, c.id]));
  stats.cards = cards.length;

  // Parallels
  const parallelRows = rows.flatMap((r) =>
    r.parallels.map((p) => ({
      card_id: must(
        cardIdByKey.get(`${setIdBySlug.get(r.setSlug)}:${r.cardNumber}`),
        `card ${r.cardSlug}`,
      ),
      name: p.name,
      serial_run: p.serialRun,
    })),
  );
  const { data: parallels, error: parallelsError } = await supabase
    .from('parallels')
    .upsert(parallelRows, { onConflict: 'card_id,name' })
    .select('id');
  if (parallelsError) throw parallelsError;
  stats.parallels = parallels.length;

  return stats;
}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what} after upsert`);
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
