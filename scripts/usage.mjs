#!/usr/bin/env node
// Prints the free-tier usage report (database size, storage, rows, job activity).
// Usage: pnpm db:usage   (reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from scripts/.env)
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(import.meta.dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}
const res = await fetch(`${url}/rest/v1/rpc/usage_report`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
  body: '{}',
});
if (!res.ok) {
  console.error(res.status, await res.text());
  process.exit(1);
}
const rows = await res.json();
console.table(rows.map((r) => ({ metric: r.metric, value: Number(r.value).toFixed(2), unit: r.unit, note: r.note ?? '' })));
