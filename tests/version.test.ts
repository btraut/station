import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'src', 'cli.ts');
const tsxPath = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const packageJsonPath = path.join(repoRoot, 'package.json');

function readVersion(): string {
  const content = readFileSync(packageJsonPath, 'utf8');
  return (JSON.parse(content) as { version: string }).version;
}

describe('version flags', () => {
  it('supports -v as shorthand for --version', () => {
    const expectedVersion = readVersion();

    const shortOutput = execFileSync(tsxPath, [cliPath, '-v'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    }).toString().trim();

    const longOutput = execFileSync(tsxPath, [cliPath, '--version'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    }).toString().trim();

    expect(shortOutput).toBe(expectedVersion);
    expect(longOutput).toBe(expectedVersion);
  });
});
