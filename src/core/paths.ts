import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { StationError } from './errors.js';

export type StationPaths = {
  repoRoot: string;
  gitCommonDir: string;
  stationDir: string;
  dbPath: string;
  configPath: string;
  lockPath: string;
};

export async function resolveStationPaths(startDir = process.cwd()): Promise<StationPaths> {
  const { repoRoot, gitCommonDir } = resolveGitContext(startDir);
  const stationDir = path.join(gitCommonDir, 'station');

  return {
    repoRoot,
    gitCommonDir,
    stationDir,
    dbPath: path.join(stationDir, 'station.db'),
    configPath: path.join(stationDir, 'config.json'),
    lockPath: path.join(stationDir, 'station.lock')
  };
}

export async function ensureStationLayout(paths: StationPaths): Promise<void> {
  await mkdir(paths.stationDir, { recursive: true });

  if (!existsSync(paths.configPath)) {
    await writeFile(
      paths.configPath,
      `${JSON.stringify({ backend: 'sqlite', version: 1 }, null, 2)}\n`,
      'utf8'
    );
  }
}

export async function readConfig(paths: StationPaths): Promise<{ backend: string; version: number }> {
  const raw = await readFile(paths.configPath, 'utf8');
  return JSON.parse(raw) as { backend: string; version: number };
}

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(current, '.git'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new StationError('Not inside a git repository', { code: 'NOT_A_GIT_REPO', exitCode: 2 });
    }
    current = parent;
  }
}

function resolveGitContext(startDir: string): { repoRoot: string; gitCommonDir: string } {
  try {
    const repoRoot = runGit(['rev-parse', '--show-toplevel'], startDir);
    const rawGitCommonDir = runGit(['rev-parse', '--git-common-dir'], startDir);
    const gitCommonDir = path.isAbsolute(rawGitCommonDir)
      ? rawGitCommonDir
      : path.resolve(repoRoot, rawGitCommonDir);

    return {
      repoRoot: path.resolve(repoRoot),
      gitCommonDir: path.resolve(gitCommonDir)
    };
  } catch {
    const repoRoot = findRepoRoot(startDir);
    return {
      repoRoot,
      gitCommonDir: path.join(repoRoot, '.git')
    };
  }
}

function runGit(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'ignore']
  })
    .toString()
    .trim();
}
