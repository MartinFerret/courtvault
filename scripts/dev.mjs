#!/usr/bin/env node
// `pnpm dev`: starts local Supabase, serves the edge functions, the website and the app.
// Everything runs in mock mode without external keys.
import { spawn, execSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// First-run convenience: create local env files from the examples.
for (const [example, target] of [
  ['supabase/functions/.env.example', 'supabase/functions/.env'],
  ['scripts/.env.example', 'scripts/.env'],
  ['apps/web/.env.example', 'apps/web/.env.local'],
  ['apps/mobile/.env.example', 'apps/mobile/.env'],
]) {
  if (!existsSync(resolve(root, target))) {
    copyFileSync(resolve(root, example), resolve(root, target));
    console.log(`created ${target} from ${example} (fill in the local keys printed by \`supabase status\`)`);
  }
}

console.log('Starting local Supabase...');
execSync('supabase start', { cwd: root, stdio: 'inherit' });

const procs = [
  ['functions', 'supabase', ['functions', 'serve', '--env-file', 'supabase/functions/.env', '--no-verify-jwt']],
  ['web', 'pnpm', ['--filter', '@courtvault/web', 'dev']],
  ['mobile', 'pnpm', ['--filter', '@courtvault/mobile', 'dev']],
].map(([name, cmd, args]) => {
  const child = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  const prefix = (chunk) => chunk.toString().split('\n').filter(Boolean).map((l) => `[${name}] ${l}`).join('\n') + '\n';
  child.stdout.on('data', (c) => process.stdout.write(prefix(c)));
  child.stderr.on('data', (c) => process.stderr.write(prefix(c)));
  return child;
});

console.log('\n  Studio    http://127.0.0.1:54323\n  Mailpit   http://127.0.0.1:54324 (OTP codes)\n  Website   http://localhost:3000\n  App       http://localhost:4200\n');

const stop = () => {
  for (const p of procs) p.kill('SIGINT');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
