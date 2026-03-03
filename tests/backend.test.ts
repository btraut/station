import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'src', 'cli.ts');
const tsxPath = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function createRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'station-backend-'));
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

describe('backend adapters', () => {
  it('exposes supported and unsupported backends in info output', () => {
    const repo = createRepo();
    runJson(repo, ['init']);

    const info = runJson(repo, ['info']) as {
      ok: true;
      data: { backends: Array<{ name: string; supported: boolean }> };
    };

    expect(info.data.backends).toEqual([
      { name: 'sqlite', supported: true },
      { name: 'linear', supported: false },
      { name: 'asana', supported: false }
    ]);
  });

  it('returns explicit not-implemented error for stub backends', () => {
    const repo = createRepo();
    runJson(repo, ['init']);
    const info = runJson(repo, ['info']) as { ok: true; data: { configPath: string } };

    const configPath = info.data.configPath;
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as { backend: string; version: number };
    config.backend = 'linear';
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    let code = 0;
    let stdout = '';

    try {
      execFileSync(tsxPath, [cliPath, 'list', '--json'], {
        cwd: repo,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      code = (error as { status?: number }).status ?? 0;
      stdout = (error as { stdout?: Buffer }).stdout?.toString() ?? '';
    }

    expect(code).toBe(1);
    const payload = JSON.parse(stdout) as { ok: boolean; error: { code: string } };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe('BACKEND_NOT_IMPLEMENTED');
  });
});
