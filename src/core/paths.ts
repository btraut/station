import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { StationError } from './errors.js';

export type StationPaths = {
  repoRoot: string;
  stationDir: string;
  dbPath: string;
  configPath: string;
  lockPath: string;
};

export async function resolveStationPaths(startDir = process.cwd()): Promise<StationPaths> {
  const repoRoot = findRepoRoot(startDir);
  const stationDir = path.join(repoRoot, '.station');

  return {
    repoRoot,
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
