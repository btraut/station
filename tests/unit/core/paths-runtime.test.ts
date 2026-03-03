import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveStationPaths } from '../../../src/core/paths.js';
import { wantsJson } from '../../../src/core/runtime.js';

const tempDirs: string[] = [];

function makeTemp(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('repo path and runtime contracts', () => {
  it('resolves repo root from nested folders when .git exists', async () => {
    const repo = makeTemp('station-paths-repo-');
    const nested = path.join(repo, 'nested', 'more');
    mkdirSync(path.join(repo, '.git'), { recursive: true });
    mkdirSync(nested, { recursive: true });

    const paths = await resolveStationPaths(nested);
    expect(paths.repoRoot).toBe(repo);
    expect(paths.gitCommonDir).toBe(path.join(repo, '.git'));
    expect(paths.stationDir).toBe(path.join(repo, '.git', 'station'));
    expect(paths.dbPath).toBe(path.join(repo, '.git', 'station', 'station.db'));
    expect(paths.configPath).toBe(path.join(repo, '.git', 'station', 'config.json'));
    expect(paths.lockPath).toBe(path.join(repo, '.git', 'station', 'station.lock'));
  });

  it('throws NOT_A_GIT_REPO outside any repository', async () => {
    const dir = makeTemp('station-paths-norepo-');

    await expect(resolveStationPaths(dir)).rejects.toMatchObject({
      code: 'NOT_A_GIT_REPO',
      exitCode: 2
    });
  });

  it('detects json mode from argv', () => {
    const originalArgv = process.argv;
    try {
      process.argv = ['node', 'station', 'list'];
      expect(wantsJson()).toBe(false);

      process.argv = ['node', 'station', 'list', '--json'];
      expect(wantsJson()).toBe(true);
    } finally {
      process.argv = originalArgv;
    }
  });
});
