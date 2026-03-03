import { listBackendAdapters } from '../backend/registry.js';
import { ensureStationLayout, readConfig, resolveStationPaths } from '../core/paths.js';
import { ensureDatabase } from '../db/database.js';

export async function initializeStation() {
  const paths = await resolveStationPaths();
  await ensureStationLayout(paths);
  await ensureDatabase(paths.dbPath);

  return {
    initialized: true,
    stationDir: paths.stationDir,
    dbPath: paths.dbPath
  };
}

export async function getStationInfo() {
  const paths = await resolveStationPaths();
  await ensureStationLayout(paths);
  await ensureDatabase(paths.dbPath);
  const config = await readConfig(paths);

  return {
    repoRoot: paths.repoRoot,
    gitCommonDir: paths.gitCommonDir,
    stationDir: paths.stationDir,
    dbPath: paths.dbPath,
    configPath: paths.configPath,
    lockPath: paths.lockPath,
    config,
    backends: listBackendAdapters().map((backend) => ({
      name: backend.name,
      supported: backend.supported
    }))
  };
}
