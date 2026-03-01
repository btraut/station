import BetterSqlite3 from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runMigrations } from './migrations.js';

export function openDatabase(dbPath: string): DatabaseType {
  const db = new BetterSqlite3(dbPath);
  runMigrations(db);
  return db;
}

export async function ensureDatabase(dbPath: string): Promise<void> {
  await mkdir(path.dirname(dbPath), { recursive: true });
  const db = openDatabase(dbPath);
  db.close();
}
