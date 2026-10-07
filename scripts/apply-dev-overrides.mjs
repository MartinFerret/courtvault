#!/usr/bin/env node
// Applies dev-only overrides after `supabase db reset`.
// FREE_CARD_LIMIT_OVERRIDE=5 lowers the free card limit so the paywall can be tested quickly.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const envPath = resolve(import.meta.dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
const override = process.env.FREE_CARD_LIMIT_OVERRIDE;
if (!override) process.exit(0);
let url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
// `pnpm db:reset` sets SUPABASE_LOCAL=1: never patch a cloud project from here.
if (process.env.SUPABASE_LOCAL) {
  url = 'http://127.0.0.1:54321';
  key = /^SERVICE_ROLE_KEY="?([^"\n]+)"?$/m.exec(execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' }))?.[1];
}
const res = await fetch(`${url}/rest/v1/plan_limits?key=eq.cards`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
  body: JSON.stringify({ free_value: Number(override) }),
});
console.log(res.ok ? `Free card limit set to ${override} (FREE_CARD_LIMIT_OVERRIDE)` : `Override failed: ${res.status}`);
process.exit(res.ok ? 0 : 1);
