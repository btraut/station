import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  name: string;
  version: string;
  bin: { station: string };
};

describe('release artifact smoke checks', () => {
  it('executes the built dist CLI artifact', () => {
    execFileSync('npm', ['run', 'build'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const versionOutput = execFileSync('node', [path.join(repoRoot, 'dist', 'cli.js'), '--version'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    }).toString();

    expect(versionOutput.trim()).toBe(packageJson.version);
  });

  it('keeps npm package file list and bin wiring intact', () => {
    const raw = execFileSync('npm', ['pack', '--json', '--dry-run'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    }).toString();
    const packResult = JSON.parse(raw) as Array<{
      name: string;
      files: Array<{ path: string }>;
    }>;

    const first = packResult[0];
    const packedPaths = new Set(first.files.map((entry) => entry.path));

    expect(first.name).toBe(packageJson.name);
    expect(packageJson.bin.station).toBe('dist/cli.js');
    expect(packedPaths.has('dist/cli.js')).toBe(true);
    expect(packedPaths.has('README.md')).toBe(true);
    expect(packedPaths.has('package.json')).toBe(true);
  });
});
