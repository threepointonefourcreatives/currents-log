/**
 * Local journal database — encrypted at rest with SQLCipher (AES-256).
 *
 * The 256-bit database key is generated on first launch and kept in
 * expo-secure-store (Android Keystore / iOS Keychain). The .db file on disk is
 * unreadable without it, so a copied file, a device backup, or a rooted file
 * browser reveals nothing.
 *
 * Requires `"useSQLCipher": true` for the expo-sqlite plugin in app.json, which
 * means a fresh native build (EAS). Older builds stored entries in a plaintext
 * file (app_logs.db); those are copied into the encrypted file once and the
 * plaintext file is deleted.
 */
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform, Alert } from 'react-native';
import { normalizeDateString } from './dateUtils';
import { logger, safeErrorMessage } from './logger';

const DB_NAME = 'journal.enc.db';
const LEGACY_PLAINTEXT_DB = 'app_logs.db';
const DB_KEY_NAME = 'journal-db-key-v1';
const IS_WEB = Platform.OS === 'web';

/** Hard limits so nobody can stuff megabytes into a single entry. */
export const MAX_NOTE_LENGTH = 2000;

export type LogRow = { id: string; date: string; score: number; note: string };

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getOrCreateDbKey(): Promise<string> {
  const opts: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
  let key = await SecureStore.getItemAsync(DB_KEY_NAME, opts);
  if (!key || !/^[0-9a-f]{64}$/.test(key)) {
    const bytes = Crypto.getRandomBytes(32);
    key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(DB_KEY_NAME, key, opts);
  }
  return key;
}

async function migrateLegacyPlaintextDb(db: SQLite.SQLiteDatabase): Promise<void> {
  const done = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'legacy_migrated'");
  if (done) return;
  let legacy: SQLite.SQLiteDatabase | null = null;
  try {
    // Opening without a key reads a plaintext file (or creates an empty one).
    legacy = await SQLite.openDatabaseAsync(LEGACY_PLAINTEXT_DB);
    const table = await legacy.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='logs'"
    );
    if (table) {
      const rows = await legacy.getAllAsync<{ date: string; score: number; note: string | null }>(
        'SELECT date, score, note FROM logs'
      );
      await db.withTransactionAsync(async () => {
        for (const r of rows) {
          const score = Math.min(5, Math.max(1, Math.round(Number(r.score)) || 3));
          const note = String(r.note ?? '').slice(0, MAX_NOTE_LENGTH);
          await db.runAsync('INSERT INTO logs (date, score, note) VALUES (?, ?, ?)', String(r.date), score, note);
        }
        await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('legacy_migrated', '1')");
      });
      logger.debug('[DB] Migrated legacy entries', { count: rows.length });
    } else {
      await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('legacy_migrated', '1')");
    }
  } catch (err) {
    logger.warn('[DB] Legacy migration skipped', err);
    return; // keep the old file so nothing is lost; retried next launch
  } finally {
    await legacy?.closeAsync().catch(() => {});
  }
  await SQLite.deleteDatabaseAsync(LEGACY_PLAINTEXT_DB).catch(() => {});
}

async function openEncryptedDb(): Promise<SQLite.SQLiteDatabase> {
  const key = await getOrCreateDbKey();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Must be the very first statement on the connection.
  await db.execAsync(`PRAGMA key = "x'${key}'";`);
  // Fails here if the key is wrong or SQLCipher isn't compiled in.
  await db.getFirstAsync('SELECT count(*) FROM sqlite_master;');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
      note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= ${MAX_NOTE_LENGTH})
    );
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
  `);
  await migrateLegacyPlaintextDb(db);
  return db;
}

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openEncryptedDb().catch((err) => {
      dbPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return dbPromise;
}

function sanitize(score: number, note: string): { score: number; note: string } {
  const s = Math.round(Number(score));
  if (!Number.isFinite(s) || s < 1 || s > 5) throw new Error('Invalid mood score');
  return { score: s, note: String(note ?? '').slice(0, MAX_NOTE_LENGTH) };
}

export const initDB = async (): Promise<void> => {
  if (IS_WEB) {
    if (!localStorage.getItem('web_logs')) localStorage.setItem('web_logs', '[]');
    return;
  }
  try {
    await getDb();
    logger.debug('[DB] Encrypted journal ready');
  } catch (error) {
    logger.error('[DB] Init error', error);
    Alert.alert('Storage error', safeErrorMessage(error, 'Your journal could not be opened. Please restart the app.'));
  }
};

export const addLog = async (score: number, note: string): Promise<void> => {
  const clean = sanitize(score, note);
  const date = new Date().toISOString();

  if (IS_WEB) {
    const logs = JSON.parse(localStorage.getItem('web_logs') || '[]');
    logs.push({ id: Date.now().toString(), date, score: clean.score, note: clean.note });
    localStorage.setItem('web_logs', JSON.stringify(logs));
    return;
  }

  try {
    const db = await getDb();
    await db.runAsync('INSERT INTO logs (date, score, note) VALUES (?, ?, ?)', date, clean.score, clean.note);
    logger.debug('[DB] Entry saved'); // never log the note itself
  } catch (error) {
    logger.error('[DB] addLog failed', error);
    Alert.alert('Not saved', safeErrorMessage(error, 'Your entry could not be saved. Please try again.'));
    throw error;
  }
};

export const getLogs = async (): Promise<LogRow[]> => {
  if (IS_WEB) {
    try {
      const logs = JSON.parse(localStorage.getItem('web_logs') || '[]') as LogRow[];
      return logs
        .map((l) => ({ ...l, date: normalizeDateString(l.date) }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (e) {
      logger.error('[DB] getLogs (web) failed', e);
      return [];
    }
  }

  try {
    const db = await getDb();
    const result = await db.getAllAsync<{ id: number; date: string; score: number; note: string }>(
      'SELECT id, date, score, note FROM logs ORDER BY date ASC'
    );
    logger.debug('[DB] Entries fetched', { count: result.length });
    return result.map((row) => ({
      id: String(row.id),
      date: normalizeDateString(row.date),
      score: row.score,
      note: row.note || '',
    }));
  } catch (error) {
    logger.error('[DB] getLogs failed', error);
    Alert.alert('Storage error', safeErrorMessage(error, 'Your journal could not be loaded.'));
    return [];
  }
};
