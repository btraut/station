import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'src', 'cli.ts');
const tsxPath = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function createRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-deps-'));
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

function expectFailure(cwd: string, args: string[]): { code: number; payload: { ok: boolean; error: { code: string } } } {
  let code = 0;
  let stdout = '';

  try {
    execFileSync(tsxPath, [cliPath, ...args, '--json'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    code = (error as { status?: number }).status ?? 0;
    stdout = (error as { stdout?: Buffer }).stdout?.toString() ?? '';
  }

  return {
    code,
    payload: JSON.parse(stdout) as { ok: boolean; error: { code: string } }
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('dependency and ready semantics', () => {
  it('returns only unblocked actionable issues in ready queue', () => {
    const repo = createRepo();

    const a = runJson(repo, ['create', '--title', 'A']) as { data: { issue: { id: string } } };
    const b = runJson(repo, ['create', '--title', 'B']) as { data: { issue: { id: string } } };
    const c = runJson(repo, ['create', '--title', 'C']) as { data: { issue: { id: string } } };

    runJson(repo, ['dep', 'add', b.data.issue.id, a.data.issue.id, '--type', 'blocks']);
    runJson(repo, ['dep', 'add', c.data.issue.id, b.data.issue.id, '--type', 'blocks']);

    let ready = runJson(repo, ['ready']) as { data: { issues: Array<{ id: string }> } };
    expect(ready.data.issues.map((issue) => issue.id)).toEqual([a.data.issue.id]);

    runJson(repo, ['close', a.data.issue.id]);
    ready = runJson(repo, ['ready']) as { data: { issues: Array<{ id: string }> } };
    expect(ready.data.issues.map((issue) => issue.id)).toEqual([b.data.issue.id]);

    runJson(repo, ['close', b.data.issue.id]);
    ready = runJson(repo, ['ready']) as { data: { issues: Array<{ id: string }> } };
    expect(ready.data.issues.map((issue) => issue.id)).toEqual([c.data.issue.id]);
  });

  it('prevents cycles and reports missing ids', () => {
    const repo = createRepo();

    const a = runJson(repo, ['create', '--title', 'A']) as { data: { issue: { id: string } } };
    const b = runJson(repo, ['create', '--title', 'B']) as { data: { issue: { id: string } } };

    runJson(repo, ['dep', 'add', a.data.issue.id, b.data.issue.id, '--type', 'blocks']);

    const cycle = expectFailure(repo, ['dep', 'add', b.data.issue.id, a.data.issue.id, '--type', 'blocks']);
    expect(cycle.code).toBe(1);
    expect(cycle.payload.ok).toBe(false);
    expect(cycle.payload.error.code).toBe('DEPENDENCY_CYCLE');

    const missing = expectFailure(repo, ['dep', 'add', 'missing-id', a.data.issue.id, '--type', 'blocks']);
    expect(missing.code).toBe(3);
    expect(missing.payload.error.code).toBe('ISSUE_NOT_FOUND');
  });

  it('supports dep list and tree', () => {
    const repo = createRepo();

    const a = runJson(repo, ['create', '--title', 'A']) as { data: { issue: { id: string } } };
    const b = runJson(repo, ['create', '--title', 'B']) as { data: { issue: { id: string } } };
    const c = runJson(repo, ['create', '--title', 'C']) as { data: { issue: { id: string } } };

    runJson(repo, ['dep', 'add', b.data.issue.id, a.data.issue.id]);
    runJson(repo, ['dep', 'add', c.data.issue.id, b.data.issue.id]);

    const listed = runJson(repo, ['dep', 'list', b.data.issue.id]) as {
      data: { dependencies: Array<{ issueId: string; dependsOnId: string }> };
    };
    expect(listed.data.dependencies).toEqual([
      { issueId: b.data.issue.id, dependsOnId: a.data.issue.id, type: 'blocks' }
    ]);

    const tree = runJson(repo, ['dep', 'tree', c.data.issue.id]) as {
      data: { dependencies: Array<{ issueId: string; dependsOnId: string }> };
    };
    expect(tree.data.dependencies).toHaveLength(2);
    expect(tree.data.dependencies).toEqual(
      expect.arrayContaining([
        { issueId: b.data.issue.id, dependsOnId: a.data.issue.id, type: 'blocks' },
        { issueId: c.data.issue.id, dependsOnId: b.data.issue.id, type: 'blocks' }
      ])
    );
  });
});
