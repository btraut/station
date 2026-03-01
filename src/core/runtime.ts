import { getBackendAdapter } from '../backend/registry.js';
import type { StationRepository } from '../db/repository.js';
import { ensureDatabase } from '../db/database.js';
import { ensureStationLayout, readConfig, resolveStationPaths } from './paths.js';

export function wantsJson(): boolean {
  return process.argv.includes('--json');
}

export async function withRepository<T>(fn: (repo: StationRepository) => T): Promise<T> {
  const paths = await resolveStationPaths();
  await ensureStationLayout(paths);

  const config = await readConfig(paths);
  if (config.backend === 'sqlite') {
    await ensureDatabase(paths.dbPath);
  }

  const adapter = getBackendAdapter(config.backend);
  const session = adapter.open(paths);
  try {
    return fn(session.repository);
  } finally {
    session.close();
  }
}
