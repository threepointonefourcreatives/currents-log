/**
 * ══════════════════════════════════════════════════════════════
 * expo-sqlite Database Configuration
 * Offline-first local database. ALL writes go here first.
 * ══════════════════════════════════════════════════════════════
 */

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DB_NAME = 'current.db';

/**
 * Open (or create) the local SQLite database.
 * Uses the synchronous API from expo-sqlite SDK 54+.
 */
export const openDatabase = (): SQLite.SQLiteDatabase | null => {
  if (Platform.OS === 'web') {
    console.log('Web environment detected: Mocking database database creation.');
    return null;
  }
  return SQLite.openDatabaseSync(DB_NAME);
};

/**
 * Initialize all tables. Call once on app startup.
 */
export const initializeDatabase = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    console.log('Web environment detected: Mocking database initialization.');
    return;
  }
  const db = openDatabase();
  if (!db) return;

  // Create logs table (mirrors Supabase schema + local sync_status)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date_logged TEXT NOT NULL,
      mood_score INTEGER NOT NULL CHECK(mood_score >= 1 AND mood_score <= 5),
      color_hex TEXT NOT NULL,
      note TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'modified')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create users cache table (local cache of Supabase user profile)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT,
      avatar_url TEXT,
      compass_quote TEXT,
      talisman_url TEXT,
      notification_preference TEXT DEFAULT 'None' CHECK(notification_preference IN ('Morning', 'Evening', 'Custom', 'None')),
      cached_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Index for fast pending-sync lookups
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_logs_sync_status ON logs(sync_status);
  `);

  // Index for date-based queries (calendar view)
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date_logged);
  `);
};

/**
 * Get all logs with a given sync status.
 */
export const getPendingLogs = (db: SQLite.SQLiteDatabase | null) => {
  if (Platform.OS === 'web' || !db) return [];
  return db.getAllSync<{
    id: string;
    user_id: string;
    date_logged: string;
    mood_score: number;
    color_hex: string;
    note: string | null;
    sync_status: string;
  }>(`SELECT * FROM logs WHERE sync_status = 'pending' OR sync_status = 'modified'`);
};

/**
 * Mark a log as synced after successful push to Supabase.
 */
export const markLogSynced = (db: SQLite.SQLiteDatabase | null, logId: string): void => {
  if (Platform.OS === 'web' || !db) return;
  db.runSync(`UPDATE logs SET sync_status = 'synced' WHERE id = ?`, [logId]);
};

/**
 * Insert a new log entry locally.
 */
export const insertLog = (
  db: SQLite.SQLiteDatabase | null,
  log: {
    id: string;
    user_id: string;
    date_logged: string;
    mood_score: number;
    color_hex: string;
    note: string | null;
    sync_status: string;
  }
): void => {
  if (Platform.OS === 'web') {
    console.log('Web environment detected: Mocking database save.');
    return;
  }
  if (!db) return;

  db.runSync(
    `INSERT INTO logs (id, user_id, date_logged, mood_score, color_hex, note, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [log.id, log.user_id, log.date_logged, log.mood_score, log.color_hex, log.note, log.sync_status]
  );
};

export { DB_NAME };
