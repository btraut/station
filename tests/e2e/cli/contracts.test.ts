import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cliPath = path.join(repoRoot, 'src', 'cli.ts');
const tsxPath = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function createRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-contracts-repo-'));
  tempDirs.push(dir);
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

function createPlainDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-contracts-norepo-'));
  tempDirs.push(dir);
  return dir;
}

function run(cwd: string, args: string[]): string {
  return execFileSync(tsxPath, [cliPath, ...args], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  }).toString();
}

function runJson(cwd: string, args: string[]): { ok: boolean; data?: unknown; error?: unknown } {
  const output = run(cwd, [...args, '--json']);
  return JSON.parse(output) as { ok: boolean; data?: unknown; error?: unknown };
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
    run(cwd, [...args, '--json']);
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

describe('cli contract e2e', () => {
  it('emits stable JSON error contracts for core failure modes', () => {
    const noRepoDir = createPlainDir();
    const missingRepo = createRepo();
    const invalidRepo = createRepo();
    const depRepo = createRepo();

    runJson(invalidRepo, ['init']);
    const invalidInfo = runJson(invalidRepo, ['info']) as {
      data: { configPath: string };
    };
    writeFileSync(
      invalidInfo.data.configPath,
      `${JSON.stringify({ backend: 'bogus', version: 1 }, null, 2)}\n`,
      'utf8'
    );

    const created = runJson(depRepo, ['create', '--title', 'A']) as {
      data: { issue: { id: string } };
    };

    const notGit = runJsonFailure(noRepoDir, ['list']);
    expect(notGit.exitCode).toBe(2);
    expect(notGit.payload.ok).toBe(false);
    expect(notGit.payload.error.code).toBe('NOT_A_GIT_REPO');

    const missing = runJsonFailure(missingRepo, ['show', 'station-999']);
    expect(missing.exitCode).toBe(3);
    expect(missing.payload.error.code).toBe('ISSUE_NOT_FOUND');

    const unknownBackend = runJsonFailure(invalidRepo, ['list']);
    expect(unknownBackend.exitCode).toBe(1);
    expect(unknownBackend.payload.error.code).toBe('UNKNOWN_BACKEND');
    expect(unknownBackend.payload.error.details).toMatchObject({
      allowed: ['sqlite', 'linear', 'asana']
    });

    const invalidStatus = runJsonFailure(depRepo, ['create', '--title', 'Bad status', '--status', 'blocked']);
    expect(invalidStatus.exitCode).toBe(1);
    expect(invalidStatus.payload.error.code).toBe('INVALID_STATUS');
    expect(invalidStatus.payload.error.details).toMatchObject({
      allowed: ['open', 'in_progress', 'closed']
    });

    const invalidPriority = runJsonFailure(depRepo, ['create', '--title', 'Bad priority', '--priority', '9']);
    expect(invalidPriority.exitCode).toBe(1);
    expect(invalidPriority.payload.error.code).toBe('INVALID_PRIORITY');
    expect(invalidPriority.payload.error.details).toMatchObject({ value: '9' });

    const invalidDepType = runJsonFailure(depRepo, [
      'dep',
      'add',
      created.data.issue.id,
      created.data.issue.id,
      '--type',
      'invalid'
    ]);
    expect(invalidDepType.exitCode).toBe(1);
    expect(invalidDepType.payload.error.code).toBe('INVALID_DEPENDENCY_TYPE');
    expect(invalidDepType.payload.error.details).toMatchObject({
      allowed: ['blocks', 'related', 'discovered_from', 'child']
    });
  });

  it('keeps stable human output for core lifecycle commands', () => {
    const repo = createRepo();

    const createOutput = run(repo, ['create', '--title', 'Alpha']);
    expect(createOutput).toBe('Created station-1: Alpha\n');

    const listOutput = run(repo, ['list']);
    expect(listOutput).toBe('station-1 [open] Alpha\n');

    const showOutput = run(repo, ['show', 'station-1']);
    expect(showOutput).toBe('station-1 Alpha\nstatus: open\npriority: 2\ntype: task\n');

    const closeOutput = run(repo, ['close', 'station-1']);
    expect(closeOutput).toBe('Closed station-1\n');

    const reopenOutput = run(repo, ['open', 'station-1']);
    expect(reopenOutput).toBe('Reopened station-1\n');
  });
});
