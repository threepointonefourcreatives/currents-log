#!/usr/bin/env node
/**
 * Live security probe — attacks YOUR Supabase project the way a stranger would,
 * using only the public anon key that ships inside the APK.
 *
 *   npm run security:check            read-only probes
 *   npm run security:check -- --write  also tries to INSERT as a stranger
 *
 * Every check should say PASS. Uses Node 18+ built-ins only; never prints keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
const dotenv = path.join(root, '.env');
if (fs.existsSync(dotenv)) {
  for (const line of fs.readFileSync(dotenv, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const URL_ = (env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
if (!URL_ || !KEY) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (frontend/.env).');
  process.exit(2);
}
const WRITE = process.argv.includes('--write');
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
let failures = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const warn = (m) => console.log(`  WARN  ${m}`);

async function req(p, init = {}) {
  let res;
  try {
    res = await fetch(URL_ + p, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  } catch (err) {
    console.error(`\nCould not reach Supabase (${err.cause?.code || err.message}). Check your internet connection and EXPO_PUBLIC_SUPABASE_URL.\n`);
    process.exit(2);
  }
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  return { status: res.status, body };
}

console.log(`\nProbing ${URL_.replace(/\/\/([^.]{4})[^.]*/, '//$1****')} as an anonymous stranger\n`);

// 1. Which tables does the API expose?
console.log('1) Exposed tables');
let tables = ['logs', 'profiles', 'users', 'user_profile', 'status_checks'];
const spec = await req('/rest/v1/');
if (spec.status === 200 && spec.body?.paths) {
  const found = Object.keys(spec.body.paths).map((p) => p.replace(/^\//, '')).filter((p) => p && !p.startsWith('rpc/'));
  tables = [...new Set([...tables, ...found])];
  warn(`API schema is readable with the anon key (${found.length} tables listed). Harmless if RLS is on, but it maps your database for attackers.`);
  const rpcs = Object.keys(spec.body.paths).filter((p) => p.startsWith('/rpc/'));
  if (rpcs.length) warn(`Callable functions exposed: ${rpcs.join(', ')} — make sure each checks auth.uid().`);
} else pass('API schema is not listable with the anon key');

// 2. Can a stranger read rows?
console.log('\n2) Reading data without signing in');
for (const t of tables) {
  const r = await req(`/rest/v1/${encodeURIComponent(t)}?select=*&limit=1`);
  if (r.status === 200 && Array.isArray(r.body) && r.body.length > 0) fail(`"${t}": rows are readable by anyone! Enable RLS (supabase/security.sql).`);
  else if (r.status === 200) pass(`"${t}": returns nothing to strangers`);
  else if ([401, 403].includes(r.status)) pass(`"${t}": access denied (${r.status})`);
  else if (r.status === 404 || r.body?.code === 'PGRST205' || r.body?.code === '42P01') pass(`"${t}": not exposed`);
  else warn(`"${t}": unexpected response ${r.status}`);
}

// 3. Can a stranger write?
console.log('\n3) Writing data without signing in');
if (WRITE) {
  const r = await req('/rest/v1/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: '00000000-0000-0000-0000-000000000000', date_logged: new Date().toISOString(), mood_score: 3, color_hex: '#EC4724', note: 'security-check probe' }),
  });
  if (r.status === 201) fail('Anonymous INSERT into "logs" succeeded! Run supabase/security.sql and delete the probe row (note = "security-check probe").');
  else pass(`Anonymous INSERT into "logs" rejected (${r.status})`);
} else console.log('  SKIP  (run with --write to test)');

// 4. Storage
console.log('\n4) File storage');
const buckets = await req('/storage/v1/bucket');
if (buckets.status === 200 && Array.isArray(buckets.body) && buckets.body.length) {
  for (const b of buckets.body) (b.public ? fail : warn)(`bucket "${b.id}" is visible to strangers${b.public ? ' and PUBLIC — anyone with a file URL can download it' : ''}`);
} else pass('No buckets visible to strangers');
const list = await req('/storage/v1/object/list/user-media', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 5 }),
});
if (list.status === 200 && Array.isArray(list.body) && list.body.length) fail('Strangers can list files in "user-media"!');
else pass('Strangers cannot list files in "user-media"');

// 5. GraphQL introspection
console.log('\n5) GraphQL');
const gql = await req('/graphql/v1', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '{ __schema { queryType { fields { name } } } }' }),
});
const fields = gql.body?.data?.__schema?.queryType?.fields?.map((f) => f.name).filter((n) => n !== 'node') ?? [];
if (fields.length) warn(`GraphQL lists: ${fields.join(', ')}. If unused, disable it (Database → Extensions → pg_graphql).`);
else pass('GraphQL exposes no collections to strangers');

// 6. Auth settings
console.log('\n6) Auth settings');
const s = await req('/auth/v1/settings');
if (s.status === 200 && s.body) {
  const ext = s.body.external || {};
  if (ext.anonymous_users) fail('Anonymous sign-ins are ENABLED — anyone can mint a session. Turn off: Authentication → Sign In / Providers.');
  else pass('Anonymous sign-ins are off');
  if (s.body.mailer_autoconfirm) fail('"Confirm email" is OFF — accounts are created without proving email ownership.');
  else pass('Email confirmation is required');
  const on = Object.entries(ext).filter(([k, v]) => v === true && !['email', 'anonymous_users'].includes(k)).map(([k]) => k);
  if (on.length) warn(`Other sign-in providers enabled: ${on.join(', ')} — disable any you don't use.`);
  else pass('Only email sign-in is enabled');
} else warn(`Could not read auth settings (${s.status})`);

console.log(failures ? `\n✖ ${failures} problem(s) found — see SECURITY.md\n` : '\n✔ No problems found\n');
process.exit(failures ? 1 : 0);
