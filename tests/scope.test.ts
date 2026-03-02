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
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-scope-'));
  tempDirs.push(dir);
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('v1 scope guardrails', () => {
  it('returns explicit scope exclusion for deferred command families', () => {
    const repo = createRepo();
    let code = 0;
    let stdout = '';

    try {
      execFileSync(tsxPath, [cliPath, 'sync', '--json'], {
        cwd: repo,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      code = (error as { status?: number }).status ?? 0;
      stdout = (error as { stdout?: Buffer }).stdout?.toString() ?? '';
    }

    expect(code).toBe(2);
    const payload = JSON.parse(stdout) as { ok: boolean; error: { code: string; details: { family: string } } };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe('V1_SCOPE_EXCLUDED');
    expect(payload.error.details.family).toBe('sync');
  });
});
