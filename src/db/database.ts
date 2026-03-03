import BetterSqlite3 from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runMigrations } from './migrations.js';

const SQLITE_BUSY_TIMEOUT_MS = 2000;

export function openDatabase(dbPath: string): DatabaseType {
  const db = new BetterSqlite3(dbPath, { timeout: SQLITE_BUSY_TIMEOUT_MS });
  db.pragma(`busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  runMigrations(db);
  return db;
}

export async function ensureDatabase(dbPath: string): Promise<void> {
  await mkdir(path.dirname(dbPath), { recursive: true });
  const db = openDatabase(dbPath);
  db.close();
}
