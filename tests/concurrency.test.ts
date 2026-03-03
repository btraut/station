import BetterSqlite3 from 'better-sqlite3';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'src', 'cli.ts');
const tsxPath = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function createRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-concurrency-'));
  tempDirs.push(dir);
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

function runJson(cwd: string, args: string[]): { ok: boolean; data?: unknown; error?: unknown } {
  const output = execFileSync(tsxPath, [cliPath, ...args, '--json'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  }).toString();

  return JSON.parse(output) as { ok: boolean; data?: unknown; error?: unknown };
}

async function runJsonAsync(cwd: string, args: string[]): Promise<{ ok: boolean; data?: unknown; error?: unknown }> {
  const result = await execFileAsync(tsxPath, [cliPath, ...args, '--json'], {
    cwd,
    encoding: 'utf8'
  });

  return JSON.parse(result.stdout) as { ok: boolean; data?: unknown; error?: unknown };
}

function runJsonFailure(
  cwd: string,
  args: string[]
): {
  exitCode: number;
  payload: { ok: boolean; error: { code: string; message: string; details?: unknown } };
} {
  let exitCode = 0;
  let stdout = '';

  try {
    runJson(cwd, args);
  } catch (error) {
    exitCode = (error as { status?: number }).status ?? 0;
    stdout = (error as { stdout?: Buffer }).stdout?.toString() ?? '';
  }

  return {
    exitCode,
    payload: JSON.parse(stdout) as { ok: boolean; error: { code: string; message: string; details?: unknown } }
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('sqlite contention hardening', () => {
  it('returns STATION_DB_BUSY when the database write lock is held', () => {
    const repo = createRepo();
    runJson(repo, ['init']);
    const info = runJson(repo, ['info']) as { data: { dbPath: string } };

    const locker = new BetterSqlite3(info.data.dbPath);
    locker.exec('BEGIN EXCLUSIVE');

    try {
      const failed = runJsonFailure(repo, ['create', '--title', 'Blocked by lock']);
      expect(failed.exitCode).toBe(1);
      expect(failed.payload.error.code).toBe('STATION_DB_BUSY');
    } finally {
      locker.exec('ROLLBACK');
      locker.close();
    }
  });

  it('returns STATION_DB_CONFLICT on explicit id collisions', () => {
    const repo = createRepo();
    runJson(repo, ['create', '--id', 'station-fixed', '--title', 'First']);

    const failed = runJsonFailure(repo, ['create', '--id', 'station-fixed', '--title', 'Second']);
    expect(failed.exitCode).toBe(1);
    expect(failed.payload.error.code).toBe('STATION_DB_CONFLICT');
  });

  it('creates unique ids under concurrent create calls', async () => {
    const repo = createRepo();

    const created = await Promise.all(
      Array.from({ length: 8 }, (_, index) => runJsonAsync(repo, ['create', '--title', `Parallel ${index + 1}`]))
    );

    const ids = created.map((result) => {
      const data = result.data as { issue: { id: string } };
      return data.issue.id;
    });

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^station-[0-9a-f-]{36}$/.test(id))).toBe(true);
  });
});
