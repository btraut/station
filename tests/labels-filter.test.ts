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
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-labels-'));
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

describe('labels and list filters', () => {
  it('supports label add/remove/list/list-all', () => {
    const repo = createRepo();

    const a = runJson(repo, ['create', '--title', 'Foundation']) as { data: { issue: { id: string } } };

    runJson(repo, ['label', 'add', a.data.issue.id, 'v1']);
    runJson(repo, ['label', 'add', a.data.issue.id, 'backend']);
    runJson(repo, ['label', 'remove', a.data.issue.id, 'backend']);

    const labels = runJson(repo, ['label', 'list', a.data.issue.id]) as { data: { labels: string[] } };
    expect(labels.data.labels).toEqual(['v1']);

    const all = runJson(repo, ['label', 'list-all']) as { data: { labels: string[] } };
    expect(all.data.labels).toEqual(['backend', 'v1']);
  });

  it('supports compound list filters and stable ordering', () => {
    const repo = createRepo();

    const a = runJson(repo, ['create', '--title', 'Alpha', '--type', 'feature', '--priority', '1']) as {
      data: { issue: { id: string } };
    };
    const b = runJson(repo, ['create', '--title', 'Beta', '--type', 'bug', '--priority', '0']) as {
      data: { issue: { id: string } };
    };
    const c = runJson(repo, ['create', '--title', 'Gamma', '--type', 'feature', '--priority', '1']) as {
      data: { issue: { id: string } };
    };

    runJson(repo, ['update', c.data.issue.id, '--status', 'in_progress']);

    runJson(repo, ['label', 'add', a.data.issue.id, 'v1']);
    runJson(repo, ['label', 'add', a.data.issue.id, 'frontend']);
    runJson(repo, ['label', 'add', b.data.issue.id, 'v1']);
    runJson(repo, ['label', 'add', c.data.issue.id, 'backend']);

    const statusType = runJson(repo, ['list', '--status', 'open', '--type', 'feature']) as {
      data: { issues: Array<{ id: string }> };
    };
    expect(statusType.data.issues.map((issue) => issue.id)).toEqual([a.data.issue.id]);

    const labelsAny = runJson(repo, ['list', '--labels-any', 'backend,v1']) as {
      data: { issues: Array<{ id: string }> };
    };
    expect(labelsAny.data.issues.map((issue) => issue.id)).toEqual([
      b.data.issue.id,
      a.data.issue.id,
      c.data.issue.id
    ]);

    const labelsAll = runJson(repo, ['list', '--labels-all', 'v1,frontend']) as {
      data: { issues: Array<{ id: string }> };
    };
    expect(labelsAll.data.issues.map((issue) => issue.id)).toEqual([a.data.issue.id]);

    const query = runJson(repo, ['list', '--query', 'amm']) as { data: { issues: Array<{ id: string }> } };
    expect(query.data.issues.map((issue) => issue.id)).toEqual([c.data.issue.id]);

    const idsAndPriority = runJson(repo, ['list', '--ids', `${a.data.issue.id},${b.data.issue.id}`, '--priority', '0,1']) as {
      data: { issues: Array<{ id: string }> };
    };
    expect(idsAndPriority.data.issues.map((issue) => issue.id)).toEqual([b.data.issue.id, a.data.issue.id]);
  });
});
