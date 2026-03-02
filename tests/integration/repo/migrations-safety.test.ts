import BetterSqlite3 from 'better-sqlite3';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, runMigrations } from '../../../src/db/migrations.js';

const tempDirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-migrations-'));
  tempDirs.push(dir);
  return path.join(dir, 'station.db');
}

function tableExists(db: BetterSqlite3.Database, name: string): boolean {
  const row = db
    .prepare("SELECT 1 as found FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { found?: number } | undefined;
  return row?.found === 1;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('migration safety', () => {
  it('bootstraps a fresh database and records current schema version', () => {
    const db = new BetterSqlite3(tempDbPath());

    runMigrations(db);

    expect(tableExists(db, 'issues')).toBe(true);
    expect(tableExists(db, 'dependencies')).toBe(true);
    expect(tableExists(db, 'labels')).toBe(true);
    expect(tableExists(db, 'issue_labels')).toBe(true);
    expect(tableExists(db, 'audit_events')).toBe(true);

    const versions = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
      .all() as Array<{ version: number }>;
    expect(versions.map((row) => row.version)).toEqual([CURRENT_SCHEMA_VERSION]);
    db.close();
  });

  it('is idempotent across repeated runs', () => {
    const db = new BetterSqlite3(tempDbPath());

    runMigrations(db);
    runMigrations(db);
    runMigrations(db);

    const row = db
      .prepare('SELECT COUNT(*) as count FROM schema_migrations WHERE version = ?')
      .get(CURRENT_SCHEMA_VERSION) as { count: number };
    expect(row.count).toBe(1);
    db.close();
  });

  it('upgrades forward from a fixture with prior schema migration entries', () => {
    const db = new BetterSqlite3(tempDbPath());
    const fixturePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'fixtures',
      'migrations',
      'v0.sql'
    );
    db.exec(readFileSync(fixturePath, 'utf8'));

    runMigrations(db);

    const versions = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
      .all() as Array<{ version: number }>;
    expect(versions.map((row) => row.version)).toEqual([0, CURRENT_SCHEMA_VERSION]);
    expect(tableExists(db, 'legacy_notes')).toBe(true);
    expect(tableExists(db, 'issues')).toBe(true);
    db.close();
  });
});
