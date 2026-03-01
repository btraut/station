import { ensureStationLayout, resolveStationPaths } from './paths.js';
import { ensureDatabase, openDatabase } from '../db/database.js';
import { StationRepository } from '../db/repository.js';

export function wantsJson(): boolean {
  return process.argv.includes('--json');
}

export async function withRepository<T>(fn: (repo: StationRepository) => T): Promise<T> {
  const paths = await resolveStationPaths();
  await ensureStationLayout(paths);
  await ensureDatabase(paths.dbPath);

  const db = openDatabase(paths.dbPath);
  try {
    return fn(new StationRepository(db));
  } finally {
    db.close();
  }
}
