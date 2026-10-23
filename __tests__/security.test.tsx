/**
 * Security regression tests — run with `npm test`.
 *
 * These try the attacks a curious user would: opening private screens through
 * links / URLs while signed out, reading the device logs, reading stored
 * tokens, tampering with input, and exporting malicious CSV.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderRouter, screen } from 'expo-router/testing-library';
import { act } from '@testing-library/react-native';

const ROOT = path.resolve(__dirname, '..');

/** Every screen file in /app, turned into the URL a deep link would use. */
function allRouteUrls(): string[] {
  const urls: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name) && !e.name.startsWith('_') && !e.name.startsWith('+')) {
        const rel = path.relative(path.join(ROOT, 'app'), p).replace(/\\/g, '/').replace(/\.tsx$/, '');
        const url = '/' + rel.replace(/\([^)]+\)\/?/g, '').replace(/(^|\/)index$/, '');
        urls.push(url.replace(/\/+$/, '') || '/');
      }
    }
  };
  walk(path.join(ROOT, 'app'));
  return [...new Set(urls)];
}

async function openAt(url: string) {
  jest.useFakeTimers();
  renderRouter('./app', { initialUrl: url });
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
}

afterEach(() => {
  (global as any).__session = null;
  jest.useRealTimers();
});

// ─── 1. Route guard ─────────────────────────────────────────────────────────

describe('signed OUT: no link or URL opens a private screen', () => {
  const publicUrls = ['/', '/otp'];
  const privateUrls = allRouteUrls().filter((u) => !publicUrls.includes(u));

  test('found the private screens to attack', () => {
    expect(privateUrls).toEqual(expect.arrayContaining(['/cabin', '/setup', '/success', '/logbook', '/surface']));
  });

  test.each(privateUrls)('deep link to %s lands on sign-in instead', async (url) => {
    await openAt(url);
    expect(screen.getByTestId('screen-prepare-log')).toBeTruthy();
  });

  test.each(['/cabin?admin=true', '/logbook?user_id=someone-else', '/setup?bypass=1&debug=true'])(
    'URL parameters cannot unlock anything: %s',
    async (url) => {
      await openAt(url);
      expect(screen.getByTestId('screen-prepare-log')).toBeTruthy();
    }
  );
});

describe('signed IN: private screens work, sign-in screens are skipped', () => {
  beforeEach(() => {
    (global as any).__session = { access_token: 't', user: { id: 'user-1' } };
  });

  test('home opens the app, not the sign-in screen', async () => {
    await openAt('/');
    expect(screen.queryByTestId('screen-prepare-log')).toBeNull();
    expect(screen.getByTestId('current-logo')).toBeTruthy();
  });

  test('the OTP screen is skipped once signed in', async () => {
    await openAt('/otp?email=victim@example.com');
    expect(screen.queryByTestId('screen-otp')).toBeNull();
  });

  test('cabin is reachable', async () => {
    await openAt('/cabin');
    expect(screen.queryByTestId('screen-prepare-log')).toBeNull();
  });
});

// ─── 2. Logs never leak in release builds ───────────────────────────────────

describe('release builds write nothing to logcat / DevTools', () => {
  test('logger and console are silent when __DEV__ is false', () => {
    const g = global as any;
    const prevDev = g.__DEV__;
    const original = { log: console.log, warn: console.warn, error: console.error };
    const spy = jest.fn();
    console.log = console.warn = console.error = spy;
    g.__DEV__ = false;
    try {
      jest.isolateModules(() => {
        const { logger, silenceConsoleInRelease, safeErrorMessage } = require('../src/utils/logger');
        logger.debug('journal note: I feel awful');
        logger.error(new Error('SELECT * FROM logs'));
        silenceConsoleInRelease();
        console.log('stray library log with a token');
        expect(safeErrorMessage(new Error('SQLITE_CORRUPT /data/user/0/...'), 'Generic')).toBe('Generic');
      });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      Object.assign(console, original);
      g.__DEV__ = prevDev;
    }
  });

  test('no app source file calls console.* directly', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !p.endsWith(path.join('utils', 'logger.ts'))) {
          if (/\bconsole\.(log|info|warn|error|debug)\(/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(ROOT, p));
        }
      }
    };
    ['app', 'components', 'src'].forEach((d) => walk(path.join(ROOT, d)));
    expect(offenders).toEqual([]);
  });
});

// ─── 3. Data at rest ────────────────────────────────────────────────────────

describe('auth tokens are encrypted on the device', () => {
  test('AsyncStorage holds only ciphertext; key lives in SecureStore', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const SecureStore = require('expo-secure-store');
    const { secureSessionStorage } = require('../src/utils/secureSessionStorage');
    const token = JSON.stringify({ access_token: 'eyJ-super-secret', refresh_token: 'refresh-me' });

    await secureSessionStorage.setItem('sb-auth-token', token);
    const allValues = (await AsyncStorage.multiGet(await AsyncStorage.getAllKeys())).map((kv: string[]) => kv[1]).join(' ');
    expect(allValues).not.toContain('super-secret');
    expect(allValues).not.toContain('refresh-me');
    expect(await secureSessionStorage.getItem('sb-auth-token')).toBe(token);

    // A copied AsyncStorage file without the Keystore key is useless.
    SecureStore.__store.clear();
    expect(await secureSessionStorage.getItem('sb-auth-token')).toBeNull();
  });
});

describe('journal database', () => {
  test('is opened with a 256-bit SQLCipher key before anything else', async () => {
    const SQLite = require('expo-sqlite');
    const { initDB } = require('../src/utils/db');
    await initDB();
    const db = SQLite.__dbs['journal.enc.db'];
    expect(db.exec[0]).toMatch(/^PRAGMA key = "x'[0-9a-f]{64}'";$/);
  });

  test('rejects tampered mood scores and caps note length', async () => {
    const { addLog, MAX_NOTE_LENGTH } = require('../src/utils/db');
    await expect(addLog(99, 'x')).rejects.toThrow('Invalid mood score');
    await expect(addLog(-1, 'x')).rejects.toThrow('Invalid mood score');
    const SQLite = require('expo-sqlite');
    await addLog(4, 'y'.repeat(MAX_NOTE_LENGTH + 500));
    const rows = SQLite.__dbs['journal.enc.db'].rows;
    expect(rows[rows.length - 1].note.length).toBe(MAX_NOTE_LENGTH);
  });
});

// ─── 4. Crash-safety & input handling ───────────────────────────────────────

test('a build without Supabase settings does not crash on import', () => {
  const saved = { ...process.env };
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  try {
    jest.isolateModules(() => {
      expect(() => require('../src/utils/supabase')).not.toThrow();
      expect(require('../src/utils/supabase').isSupabaseConfigured).toBe(false);
    });
  } finally {
    Object.assign(process.env, saved);
  }
});

test('email validation rejects junk before it reaches Supabase', () => {
  const { isPlausibleEmail } = require('../src/utils/supabase');
  expect(isPlausibleEmail('captain@example.com')).toBe(true);
  for (const bad of ['', 'nope', 'a@b', '<script>@x.com', 'a b@c.com', 'x'.repeat(250) + '@a.com']) {
    expect(isPlausibleEmail(bad)).toBe(false);
  }
});

test('CSV export neutralises spreadsheet formula injection', () => {
  const { csvCell } = require('../src/utils/csv');
  expect(csvCell('=HYPERLINK("http://evil","click")')).toBe(`"'=HYPERLINK(""http://evil"",""click"")"`);
  expect(csvCell('+cmd|calc')).toBe(`"'+cmd|calc"`);
  expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
  expect(csvCell('a normal "quoted" note')).toBe('"a normal ""quoted"" note"');
});

// ─── 5. Build guard ─────────────────────────────────────────────────────────

describe('pre-build env check', () => {
  const run = (env: Record<string, string>) => {
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'scripts/check-public-env.mjs')], {
        env: { PATH: process.env.PATH ?? '', EAS_BUILD: 'true', ...env } as unknown as NodeJS.ProcessEnv,
        stdio: 'pipe',
      });
      return 0;
    } catch (e: any) {
      return e.status as number;
    }
  };
  const fakeJwt = (role: string) =>
    ['{"alg":"HS256"}', JSON.stringify({ role })].map((s) => Buffer.from(s).toString('base64url')).join('.') + '.signature-part';

  test('blocks a build with missing Supabase settings (the original crash)', () => {
    expect(run({})).toBe(1);
  });
  test('blocks a build that ships the service_role key', () => {
    expect(run({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: fakeJwt('service_role') })).toBe(1);
  });
  test('blocks secret-looking EXPO_PUBLIC_ variables', () => {
    expect(
      run({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: fakeJwt('anon'), EXPO_PUBLIC_STRIPE_SECRET: 'sk_live_x' })
    ).toBe(1);
  });
  test('allows a correct build', () => {
    expect(run({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: fakeJwt('anon') })).toBe(0);
  });
});
