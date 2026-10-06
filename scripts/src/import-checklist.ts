/**
 * Imports a Topps checklist CSV into the catalog. Idempotent: re-running creates no duplicates.
 *
 * Usage: pnpm import:checklist data/checklists/DEMO-2025-26-topps-chrome.csv [more.csv ...]
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (scripts/.env or the environment).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@courtvault/shared';
import { config as loadEnv } from 'dotenv';
import { parseChecklistCsv, type ChecklistRow } from './checklist.js';

loadEnv({ path: resolve(import.meta.dirname, '../.env') });

async function main(): Promise<void> {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: pnpm import:checklist <file.csv> [...]');
    process.exit(1);
  }
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see scripts/.env.example).');
    process.exit(1);
  }
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });

  // pnpm runs workspace scripts from scripts/; INIT_CWD is where the user typed the command.
  const baseDir = process.env['INIT_CWD'] ?? process.cwd();
  for (const file of files) {
    const rows = parseChecklistCsv(readFileSync(resolve(baseDir, file), 'utf8'));
    console.log(`${file}: ${rows.length} cards`);
    const stats = await importRows(supabase, rows);
    console.log(`  sets ${stats.sets}, players ${stats.players}, cards ${stats.cards}, parallels ${stats.parallels}`);
  }
}

type Client = SupabaseClient<Database>;

async function importRows(supabase: Client, rows: ChecklistRow[]) {
  const stats = { sets: 0, players: 0, cards: 0, parallels: 0 };

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

  // Players
  const playersBySlug = new Map(rows.map((r) => [r.playerSlug, r]));
  const { data: players, error: playersError } = await supabase
    .from('players')
    .upsert(
      [...playersBySlug.values()].map((r) => ({ slug: r.playerSlug, name: r.playerName, team: r.team })),
      { onConflict: 'slug' },
    )
    .select('id, slug');
  if (playersError) throw playersError;
  const playerIdBySlug = new Map(players.map((p) => [p.slug, p.id]));
  stats.players = players.length;

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
      card_id: must(cardIdByKey.get(`${setIdBySlug.get(r.setSlug)}:${r.cardNumber}`), `card ${r.cardSlug}`),
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
