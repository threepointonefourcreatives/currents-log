import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { normalizeDateString } from './dateUtils';

const DB_NAME = 'app_logs.db';
const IS_WEB = Platform.OS === 'web';

export const initDB = async (): Promise<void> => {
  if (IS_WEB) {
    if (!localStorage.getItem('web_logs')) {
      localStorage.setItem('web_logs', '[]');
    }
    console.log('DB Initialized: web_logs localStorage ready');
    return;
  }
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, score INTEGER, note TEXT);'
    );
    console.log('DB Initialized: logs table ready');
  } catch (error) {
    console.error('DB Init Error:', error);
  }
};

export const addLog = async (score: number, note: string): Promise<void> => {
  const date = new Date().toISOString();
  
  if (IS_WEB) {
    try {
      const logsStr = localStorage.getItem('web_logs') || '[]';
      const logs = JSON.parse(logsStr);
      logs.push({
        id: Date.now().toString(),
        date,
        score,
        note
      });
      localStorage.setItem('web_logs', JSON.stringify(logs));
      console.log('DB Insert Success (Web):', { date, score, note });
    } catch (e) {
      console.error('DB ERROR in addLog (Web):', e);
    }
    return;
  }

  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.runAsync(
      'INSERT INTO logs (date, score, note) VALUES (?, ?, ?)',
      date,
      score,
      note
    );
    console.log('DB Insert Success:', { date, score, note });
  } catch (error) {
    console.error('DB ERROR in addLog:', error);
  }
};

export const getLogs = async (): Promise<{ id: string, date: string, score: number, note: string }[]> => {
  if (IS_WEB) {
    try {
      const logsStr = localStorage.getItem('web_logs') || '[]';
      const logs = JSON.parse(logsStr) as { id: string, date: string, score: number, note: string }[];
      const normalizedLogs = logs.map(l => ({ ...l, date: normalizeDateString(l.date) }));
      normalizedLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      console.log(`DB Fetch Retrieved ${normalizedLogs.length} logs (Web)`);
      return normalizedLogs;
    } catch (e) {
      console.error('DB ERROR in getLogs (Web):', e);
      return [];
    }
  }

  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const result = await db.getAllAsync<{ id: number, date: string, score: number, note: string }>(
      'SELECT * FROM logs ORDER BY date ASC'
    );
    console.log(`DB Fetch Retrieved ${result.length} logs`);
    return result.map(row => ({
      id: String(row.id),
      date: normalizeDateString(row.date),
      score: row.score,
      note: row.note || ''
    }));
  } catch (error) {
    console.error('DB ERROR in getLogs:', error);
    return [];
  }
};
