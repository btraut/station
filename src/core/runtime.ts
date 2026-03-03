import { getBackendAdapter } from '../backend/registry.js';
import type { StationRepository } from '../db/repository.js';
import { ensureDatabase } from '../db/database.js';
import { isStationError, StationError } from './errors.js';
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
    try {
      return fn(session.repository);
    } catch (error) {
      throw mapStorageError(error);
    }
  } finally {
    session.close();
  }
}

function mapStorageError(error: unknown): unknown {
  if (isStationError(error)) {
    return error;
  }

  const sqliteCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : undefined;

  if (sqliteCode === 'SQLITE_BUSY' || sqliteCode === 'SQLITE_BUSY_SNAPSHOT') {
    return new StationError('Station database is busy. Retry the command shortly.', {
      code: 'STATION_DB_BUSY',
      exitCode: 1,
      details: { sqliteCode }
    });
  }

  if (sqliteCode?.startsWith('SQLITE_CONSTRAINT')) {
    return new StationError('Write conflict detected in Station storage.', {
      code: 'STATION_DB_CONFLICT',
      exitCode: 1,
      details: { sqliteCode }
    });
  }

  return error;
}
