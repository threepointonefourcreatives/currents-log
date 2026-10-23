#!/usr/bin/env node
/**
 * Pre-build safety check. Runs automatically on EAS (package.json
 * "eas-build-pre-install") and manually with `npm run check:env`.
 *
 * Everything prefixed EXPO_PUBLIC_ is compiled into the app in plain text.
 * This script refuses to build when:
 *   1. the Supabase URL / anon key are missing (the app would ship broken), or
 *   2. any EXPO_PUBLIC_ value is actually a secret (service_role key, sb_secret_…,
 *      or a variable whose name says SECRET / PASSWORD / PRIVATE / SERVICE_ROLE), or
 *   3. a secret-looking key is hard-coded in the app source.
 *
 * Uses only Node built-ins (it runs before `npm install`). Never prints values.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const onEas = process.env.EAS_BUILD === 'true';
const errors = [];
const warnings = [];

// Local runs: fall back to frontend/.env (EAS never has it — by design).
const env = { ...process.env };
const dotenvPath = path.join(root, '.env');
if (!onEas && fs.existsSync(dotenvPath)) {
  for (const line of fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

function jwtRole(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
}

function looksSecret(value) {
  const v = String(value).trim();
  return v.startsWith('sb_secret_') || jwtRole(v) === 'service_role' || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(v);
}

// 1. Required public values
const url = (env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const anon = (env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
if (!url) errors.push('EXPO_PUBLIC_SUPABASE_URL is not set.');
else if (!/^https:\/\//.test(url)) errors.push('EXPO_PUBLIC_SUPABASE_URL must start with https://');
if (!anon) errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is not set.');
else {
  const role = jwtRole(anon);
  if (role && role !== 'anon') errors.push(`EXPO_PUBLIC_SUPABASE_ANON_KEY has role "${role}" — only the anon/publishable key may ship in the app.`);
  if (!role && !anon.startsWith('sb_publishable_')) warnings.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is not a recognised anon/publishable key format.');
}

// 2. No secrets in any EXPO_PUBLIC_ variable
for (const [name, value] of Object.entries(env)) {
  if (!name.startsWith('EXPO_PUBLIC_')) continue;
  if (/SECRET|PASSWORD|PRIVATE|SERVICE_ROLE|TOKEN/.test(name.replace('EXPO_PUBLIC_', ''))) {
    errors.push(`${name}: the name suggests a secret. EXPO_PUBLIC_ values are readable by anyone with the APK.`);
  }
  if (looksSecret(value)) errors.push(`${name} contains a secret (service_role / secret key). Remove it immediately and rotate it in Supabase.`);
}

// 3. No secret keys hard-coded in source
const scanDirs = ['app', 'components', 'src'];
const secretPattern = /sb_secret_[A-Za-z0-9_-]{10,}|service_role|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(p);
    else if (/\.(t|j)sx?$/.test(entry.name)) {
      const text = fs.readFileSync(p, 'utf8');
      const m = text.match(secretPattern);
      // Allow the word service_role in comments that warn against it.
      if (m && !(m[0] === 'service_role' && /\/\/|\*/.test(text.split('\n').find((l) => l.includes('service_role')) || ''))) {
        errors.push(`${path.relative(root, p)}: hard-coded key or service_role reference found. Keys belong in EAS environment variables.`);
      }
    }
  }
}
for (const d of scanDirs) if (fs.existsSync(path.join(root, d))) scan(path.join(root, d));

for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length) {
  console.error('\n✖ Security pre-build check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  console.error('\nFix: npx eas-cli env:push --environment preview --path .env   (see SECURITY.md)\n');
  process.exit(1);
}
console.log('✔ Public env check passed (Supabase URL + anon key present, no secrets in EXPO_PUBLIC_*).');
