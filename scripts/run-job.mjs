#!/usr/bin/env node
// Triggers a scheduled job manually against the local (or configured) edge functions.
// Usage: pnpm job:stats | job:prices | job:alerts | job:morning | job:compact [-- --day=YYYY-MM-DD --force]
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(import.meta.dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

const [job, ...rest] = process.argv.slice(2);
if (!job) {
  console.error('Usage: node scripts/run-job.mjs <job-name> [--day=YYYY-MM-DD] [--force]');
  process.exit(1);
}
const body = {};
for (const arg of rest) {
  const m = /^--([a-z]+)(?:=(.*))?$/.exec(arg);
  if (m) body[m[1]] = m[2] ?? true;
}

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const secret = process.env.JOB_SECRET ?? 'local-job-secret';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (job === 'job-compact') {
  // Pure SQL job: call the RPC with the service role.
  const res = await fetch(`${url}/rest/v1/rpc/compact_price_points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    body: '{}',
  });
  console.log(res.status, await res.text());
  process.exit(res.ok ? 0 : 1);
}

const res = await fetch(`${url}/functions/v1/${job}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-job-secret': secret },
  body: JSON.stringify(body),
});
const text = await res.text();
console.log(`${job} -> ${res.status}`);
console.log(text);
process.exit(res.ok ? 0 : 1);
