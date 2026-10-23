# Currents — Security

## The one idea to remember

**Anything inside the app can be read by anyone who has the app.** An APK is a
zip file; the JavaScript, every `EXPO_PUBLIC_` value, and every network call
can be inspected. So security does not come from hiding things in the app. It
comes from the **server refusing anything it shouldn't allow**:

| Layer | What protects it |
|---|---|
| Your data in Supabase | Row Level Security (`supabase/security.sql`) — the database itself checks every request |
| Who is signed in | Supabase Auth — sessions are signed by Supabase and can't be forged |
| Data on the phone | SQLCipher (journal) + Android Keystore (tokens) |
| What ships in the APK | Pre-build check (`scripts/check-public-env.mjs`) |

The Supabase **anon key is meant to be public**. Hiding it in `.gitignore` does
not protect anything (and is what made the EAS build crash). The **service_role**
key is the dangerous one — it must never be in the app, in `EXPO_PUBLIC_*`, or in git.

## What is in place

**In the app**
- **Login gate** (`app/_layout.tsx`, `Stack.Protected`): deep links (`current://cabin`),
  web URLs (`/logbook`) and URL parameters (`?admin=true`) can't open private
  screens while signed out. Every new screen must be added to a guard group;
  the test suite fails if one is missing.
- **No logs in release builds** (`src/utils/logger.ts`): nothing reaches
  `adb logcat` or DevTools; the console is silenced globally in release.
  Never log notes, emails or tokens, even in dev.
- **No internals in error messages**: users see generic text; raw errors only in dev builds.
- **Encrypted tokens** (`src/utils/secureSessionStorage.ts`): the Supabase
  session is AES-encrypted with a key held in the Android Keystore.
- **Encrypted journal** (`src/utils/db.ts`): SQLCipher AES-256, key in the Keystore.
  Old plaintext entries are migrated once and the plaintext file is deleted.
- **Input limits**: mood 1–5, note ≤ 2000 chars, email/OTP validated —
  enforced again by the database.
- **CSV export**: protected against spreadsheet formula injection; the temp file is deleted.

**In the Android build** (`app.json`)
- `allowBackup: false` — journal/tokens are never copied to cloud backups.
- `usesCleartextTraffic: false` — HTTPS only.
- Camera, microphone and storage permissions removed (the app doesn't use them).
- Release builds are not debuggable and have no dev menu.

**Build pipeline**
- `eas-build-pre-install` runs `scripts/check-public-env.mjs`: the build stops
  if the Supabase URL/key are missing, if a service_role/secret key is in any
  `EXPO_PUBLIC_` variable, or if a key is hard-coded in source.

**Backend** (`backend/server.py`): the unauthenticated template endpoints were
removed. Any future route must use `require_user`. If you never deploy it,
delete the folder.

## One-time setup (you must do these)

1. **Run the database rules**: Supabase Dashboard → SQL Editor → paste
   `supabase/security.sql` → Run. The audit queries at the bottom should return 0 rows
   (except possibly section b).
2. **Supabase dashboard settings**
   - Authentication → Sign In / Providers: **Email on, everything else off**
     (especially *Anonymous sign-ins*). *Confirm email* on.
   - Authentication → Email: OTP expiry **600 s** (10 min), OTP length 6+.
   - Authentication → Rate Limits: keep defaults or lower (e.g. 30 emails/hour).
   - Authentication → URL Configuration: no `localhost` or wildcard redirect URLs in production.
   - Database → Extensions: disable **pg_graphql** if you don't use GraphQL.
   - Advisors → Security Advisor: fix everything it lists.
3. **EAS environment variables**: `npx eas-cli env:push --environment preview --path .env`
   (and `--environment production` before a store release).
4. **Git clean-up** (in `frontend/`):
   ```
   git rm --cached .env
   git rm -r --cached .metro-cache
   git add -A && git commit -m "Security hardening; stop tracking .env and metro cache"
   ```
   Make sure both GitHub repos are **Private** (repo → Settings → General → Danger Zone).
   If a **service_role** key was ever committed or shared, rotate it:
   Supabase → Project Settings → API Keys.

## Checks to run

| Command | What it does |
|---|---|
| `npm test` | 24 security regression tests (route guard, logs, encryption, input, build guard) |
| `npm run check:env` | Same check EAS runs before every build |
| `npm run security:check` | Attacks your **live** Supabase project as a stranger using the public key; every line should say PASS |
| `npm run security:check -- --write` | Also tries to write data as a stranger |

## Honest limits

- A determined person can always read and modify **their own copy** of the app
  and watch **their own** network traffic. That is why every rule lives on the
  server; the app is never trusted.
- On a **rooted** phone with the app unlocked and running, an attacker with
  root can read memory. Encryption at rest protects copies, backups and
  powered-off/locked devices.
- Remaining `npm audit` items are in build tools (Metro, Expo CLI) that run on
  your PC, not in the APK. Re-run `npx expo install --check` and `npm audit`
  when upgrading the Expo SDK.

## Rules for future changes

1. Never put a secret in the app. If something needs a secret, it goes in a server
   function (Supabase Edge Function or `backend/`) that checks the user's session.
2. Every new Supabase table: enable RLS + add owner policies (copy the `logs` pattern).
3. Every new screen in `/app`: add it to a `Stack.Protected` group in `app/_layout.tsx`.
4. Never trust IDs from URLs, route params or request bodies — use `auth.uid()` / the session.
5. Use `logger`, never `console`, and never log user content.
