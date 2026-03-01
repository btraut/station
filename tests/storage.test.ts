import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureDatabase, openDatabase } from '../src/db/database';
import { StationRepository } from '../src/db/repository';

const tempDirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-test-'));
  tempDirs.push(dir);
  return path.join(dir, 'station.db');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('sqlite storage', () => {
  it('initializes schema idempotently', async () => {
    const dbPath = tempDbPath();

    await ensureDatabase(dbPath);
    await ensureDatabase(dbPath);

    const db = openDatabase(dbPath);
    const row = db
      .prepare('SELECT COUNT(*) as count FROM schema_migrations WHERE version = 1')
      .get() as { count: number };

    expect(row.count).toBe(1);
    db.close();
  });

  it('supports issue/dependency/label CRUD', async () => {
    const dbPath = tempDbPath();
    await ensureDatabase(dbPath);

    const db = openDatabase(dbPath);
    const repo = new StationRepository(db);

    repo.createIssue({ id: 'station-1', type: 'task', priority: 1, title: 'First issue' });
    repo.createIssue({ id: 'station-2', type: 'task', priority: 2, title: 'Second issue' });

    repo.updateIssue('station-2', { status: 'in_progress', notes: 'doing work' });

    repo.addDependency({ issueId: 'station-2', dependsOnId: 'station-1', type: 'blocks' });
    expect(repo.listDependencies('station-2')).toEqual([
      { issueId: 'station-2', dependsOnId: 'station-1', type: 'blocks' }
    ]);

    repo.addLabel('station-1', 'foundation');
    repo.addLabel('station-1', 'v1');
    repo.removeLabel('station-1', 'v1');

    expect(repo.listLabels('station-1')).toEqual(['foundation']);
    expect(repo.listAllLabels()).toEqual(['foundation', 'v1']);

    const issues = repo.listIssues();
    expect(issues).toHaveLength(2);
    expect(repo.getIssueOrThrow('station-2').status).toBe('in_progress');

    db.close();
  });
});
