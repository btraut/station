import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const cliPath = '/Users/btraut/Development/station/src/cli.ts';
const tsxPath = '/Users/btraut/Development/station/node_modules/.bin/tsx';

function createRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-cli-'));
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

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('lifecycle commands', () => {
  it('creates, updates, closes, reopens, and lists issues', () => {
    const repo = createRepo();

    const created = runJson(repo, ['create', '--title', 'Ship station']) as {
      ok: true;
      data: { issue: { id: string } };
    };
    expect(created.ok).toBe(true);
    const issueId = created.data.issue.id;

    const listed = runJson(repo, ['list']) as { ok: true; data: { issues: Array<{ id: string }> } };
    expect(listed.data.issues.map((issue) => issue.id)).toContain(issueId);

    const updated = runJson(repo, ['update', issueId, '--status', 'in_progress', '--priority', '1']) as {
      ok: true;
      data: { issue: { status: string; priority: number } };
    };
    expect(updated.data.issue.status).toBe('in_progress');
    expect(updated.data.issue.priority).toBe(1);

    const closed = runJson(repo, ['close', issueId]) as { ok: true; data: { issue: { status: string } } };
    expect(closed.data.issue.status).toBe('closed');

    const reopened = runJson(repo, ['open', issueId]) as { ok: true; data: { issue: { status: string } } };
    expect(reopened.data.issue.status).toBe('open');

    const shown = runJson(repo, ['show', issueId]) as { ok: true; data: { issue: { id: string } } };
    expect(shown.data.issue.id).toBe(issueId);
  });

  it('returns actionable validation error for invalid flags', () => {
    const repo = createRepo();
    let code = 0;
    let stdout = '';

    try {
      execFileSync(tsxPath, [cliPath, 'update', 'station-1', '--json'], {
        cwd: repo,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      code = (error as { status?: number }).status ?? 0;
      stdout = (error as { stdout?: Buffer }).stdout?.toString() ?? '';
    }

    expect(code).toBe(1);
    const payload = JSON.parse(stdout) as { ok: boolean; error: { code: string; message: string } };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe('NO_UPDATE_FIELDS');
  });
});
