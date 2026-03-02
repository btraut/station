import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureDatabase, openDatabase } from '../../../src/db/database';
import { StationRepository } from '../../../src/db/repository';
import { StationError } from '../../../src/core/errors.js';

const tempDirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-repo-matrix-'));
  tempDirs.push(dir);
  return path.join(dir, 'station.db');
}

afterEach(() => {
  vi.useRealTimers();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('sqlite repository integration matrix', () => {
  it('returns deterministic ordering by priority then created_at then id', async () => {
    const dbPath = tempDbPath();
    await ensureDatabase(dbPath);
    const db = openDatabase(dbPath);
    const repo = new StationRepository(db);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    repo.createIssue({ id: 'station-2', type: 'task', priority: 1, title: 'Second' });
    vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'));
    repo.createIssue({ id: 'station-1', type: 'task', priority: 1, title: 'First' });
    vi.setSystemTime(new Date('2026-01-01T00:00:02.000Z'));
    repo.createIssue({ id: 'station-3', type: 'task', priority: 0, title: 'Highest' });

    expect(repo.listIssues().map((issue) => issue.id)).toEqual(['station-3', 'station-2', 'station-1']);
    db.close();
  });

  it('updates closed_at when closing and clears it when reopening', async () => {
    const dbPath = tempDbPath();
    await ensureDatabase(dbPath);
    const db = openDatabase(dbPath);
    const repo = new StationRepository(db);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    repo.createIssue({ id: 'station-1', type: 'task', priority: 2, title: 'Lifecycle' });
    expect(repo.getIssueOrThrow('station-1').closedAt).toBeNull();

    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    const closed = repo.updateIssue('station-1', { status: 'closed' });
    expect(closed.closedAt).toBe('2026-01-01T00:00:10.000Z');

    vi.setSystemTime(new Date('2026-01-01T00:00:20.000Z'));
    const reopened = repo.updateIssue('station-1', { status: 'open' });
    expect(reopened.closedAt).toBeNull();

    db.close();
  });

  it('supports labels-any and labels-all filters', async () => {
    const dbPath = tempDbPath();
    await ensureDatabase(dbPath);
    const db = openDatabase(dbPath);
    const repo = new StationRepository(db);

    repo.createIssue({ id: 'station-1', type: 'task', priority: 1, title: 'A' });
    repo.createIssue({ id: 'station-2', type: 'task', priority: 2, title: 'B' });
    repo.createIssue({ id: 'station-3', type: 'task', priority: 3, title: 'C' });

    repo.addLabel('station-1', 'v1');
    repo.addLabel('station-1', 'backend');
    repo.addLabel('station-2', 'v1');
    repo.addLabel('station-3', 'frontend');

    expect(repo.listIssues({ labelsAny: ['backend', 'frontend'] }).map((issue) => issue.id)).toEqual([
      'station-1',
      'station-3'
    ]);
    expect(repo.listIssues({ labelsAll: ['v1', 'backend'] }).map((issue) => issue.id)).toEqual([
      'station-1'
    ]);
    db.close();
  });

  it('returns only actionable unblocked issues in ready queue', async () => {
    const dbPath = tempDbPath();
    await ensureDatabase(dbPath);
    const db = openDatabase(dbPath);
    const repo = new StationRepository(db);

    repo.createIssue({ id: 'station-1', type: 'task', priority: 1, title: 'A' });
    repo.createIssue({ id: 'station-2', type: 'task', priority: 1, title: 'B' });
    repo.createIssue({ id: 'station-3', type: 'task', priority: 1, title: 'C' });

    repo.addDependency({ issueId: 'station-2', dependsOnId: 'station-1', type: 'blocks' });
    repo.addDependency({ issueId: 'station-3', dependsOnId: 'station-2', type: 'blocks' });

    expect(repo.listReadyIssues().map((issue) => issue.id)).toEqual(['station-1']);
    repo.updateIssue('station-1', { status: 'closed' });

    expect(repo.listReadyIssues().map((issue) => issue.id)).toEqual(['station-2']);
    repo.updateIssue('station-2', { status: 'closed' });

    expect(repo.listReadyIssues().map((issue) => issue.id)).toEqual(['station-3']);
    repo.updateIssue('station-3', { status: 'closed' });
    expect(repo.listReadyIssues()).toEqual([]);

    db.close();
  });

  it('rejects self-reference and cycle dependencies', async () => {
    const dbPath = tempDbPath();
    await ensureDatabase(dbPath);
    const db = openDatabase(dbPath);
    const repo = new StationRepository(db);

    repo.createIssue({ id: 'station-1', type: 'task', priority: 1, title: 'A' });
    repo.createIssue({ id: 'station-2', type: 'task', priority: 2, title: 'B' });

    expect(() =>
      repo.addDependency({ issueId: 'station-1', dependsOnId: 'station-1', type: 'blocks' })
    ).toThrowError(StationError);
    try {
      repo.addDependency({ issueId: 'station-1', dependsOnId: 'station-1', type: 'blocks' });
    } catch (error) {
      expect((error as StationError).code).toBe('DEPENDENCY_SELF_REFERENCE');
    }

    repo.addDependency({ issueId: 'station-2', dependsOnId: 'station-1', type: 'blocks' });
    expect(() =>
      repo.addDependency({ issueId: 'station-1', dependsOnId: 'station-2', type: 'blocks' })
    ).toThrowError(StationError);
    try {
      repo.addDependency({ issueId: 'station-1', dependsOnId: 'station-2', type: 'blocks' });
    } catch (error) {
      expect((error as StationError).code).toBe('DEPENDENCY_CYCLE');
    }

    db.close();
  });
});
