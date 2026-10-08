#!/usr/bin/env node
// Builds the web app for app.hoopticker.com against the cloud Supabase project and uploads it to
// the Cloudflare Pages project `hoopticker-vault` (direct upload, no Git integration). Needs a
// `wrangler login` session and apps/web/.env for the cloud URL and anon key (both public).
// Usage, from the repository root: pnpm deploy:app
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const webEnv = Object.fromEntries(
  readFileSync(resolve(root, 'apps/web/.env'), 'utf8')
    .split('\n')
    .map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, '')]),
);
const supabaseUrl = webEnv['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = webEnv['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
if (!supabaseUrl?.startsWith('https://') || !anonKey) {
  console.error('apps/web/.env must hold the cloud NEXT_PUBLIC_SUPABASE_URL and ..._ANON_KEY');
  process.exit(1);
}
const env = {
  ...process.env,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: anonKey,
  WEB_URL: process.env['WEB_URL'] ?? 'https://hoopticker.com',
  // Provider keys come from the process env when set (RevenueCat web is not used: Stripe is).
  REVENUECAT_APPLE_KEY: process.env['REVENUECAT_APPLE_KEY'] ?? '',
  REVENUECAT_GOOGLE_KEY: process.env['REVENUECAT_GOOGLE_KEY'] ?? '',
  GOOGLE_WEB_CLIENT_ID: process.env['GOOGLE_WEB_CLIENT_ID'] ?? '',
  APPLE_SIGN_IN_ENABLED: process.env['APPLE_SIGN_IN_ENABLED'] ?? '',
};
const run = (cmd, cwd) => execSync(cmd, { cwd, env, stdio: 'inherit' });
run('pnpm --filter @courtvault/mobile build', root);
run(
  'npx --yes wrangler@4 pages deploy dist/mobile/browser --project-name hoopticker-vault --branch main --commit-dirty=true',
  resolve(root, 'apps/mobile'),
);
// The build wrote src/environments/environment.generated.ts with cloud values; restore the local ones.
run('node tools/write-env.mjs', resolve(root, 'apps/mobile'));
