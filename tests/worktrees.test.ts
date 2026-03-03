import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(projectRoot, 'src', 'cli.ts');
const tsxPath = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
);

function createRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-worktrees-main-'));
  tempDirs.push(dir);
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  writeFileSync(path.join(dir, 'README.md'), '# temp\n', 'utf8');
  execFileSync('git', ['add', 'README.md'], { cwd: dir, stdio: 'ignore' });
  execFileSync(
    'git',
    ['-c', 'user.name=Station Test', '-c', 'user.email=station@example.com', 'commit', '-m', 'init'],
    { cwd: dir, stdio: 'ignore' }
  );
  return dir;
}

function createWorktree(repo: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-worktrees-child-'));
  tempDirs.push(dir);
  execFileSync('git', ['worktree', 'add', dir, '-b', 'worktree-state-test'], {
    cwd: repo,
    stdio: 'ignore'
  });
  return dir;
}

function runJson(cwd: string, args: string[]): { ok: boolean; data?: unknown; error?: unknown } {
  const output = execFileSync(tsxPath, [cliPath, ...args, '--json'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  }).toString();

  return JSON.parse(output) as { ok: boolean; data?: unknown; error?: unknown };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('git worktree storage behavior', () => {
  it('shares station state across worktrees in the same repository', () => {
    const repo = createRepo();
    const worktree = createWorktree(repo);

    const created = runJson(repo, ['create', '--title', 'Shared across worktrees']) as {
      ok: true;
      data: { issue: { id: string } };
    };
    const issueId = created.data.issue.id;

    const listed = runJson(worktree, ['list']) as {
      ok: true;
      data: { issues: Array<{ id: string }> };
    };
    expect(listed.data.issues.map((issue) => issue.id)).toContain(issueId);

    const infoA = runJson(repo, ['info']) as {
      ok: true;
      data: { stationDir: string; dbPath: string };
    };
    const infoB = runJson(worktree, ['info']) as {
      ok: true;
      data: { stationDir: string; dbPath: string };
    };

    expect(infoA.data.stationDir).toBe(infoB.data.stationDir);
    expect(infoA.data.dbPath).toBe(infoB.data.dbPath);
  });
});
