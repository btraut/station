import { Command } from 'commander';
import { listBackendAdapters } from '../backend/registry.js';
import { ensureStationLayout, readConfig, resolveStationPaths } from '../core/paths.js';
import { success } from '../core/output.js';
import { ensureDatabase } from '../db/database.js';

export function registerInfoCommand(program: Command): void {
  program
    .command('info')
    .description('Show current station configuration')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const wantsJson = process.argv.includes('--json');
      const paths = await resolveStationPaths();
      await ensureStationLayout(paths);
      await ensureDatabase(paths.dbPath);
      const config = await readConfig(paths);

      const payload = {
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

      if (wantsJson) {
        process.stdout.write(`${JSON.stringify(success(payload), null, 2)}\n`);
        return;
      }

      process.stdout.write(`repoRoot: ${payload.repoRoot}\n`);
      process.stdout.write(`gitCommonDir: ${payload.gitCommonDir}\n`);
      process.stdout.write(`stationDir: ${payload.stationDir}\n`);
      process.stdout.write(`dbPath: ${payload.dbPath}\n`);
      process.stdout.write(`configPath: ${payload.configPath}\n`);
      process.stdout.write(`lockPath: ${payload.lockPath}\n`);
      process.stdout.write(`backend: ${payload.config.backend}\n`);
    });
}
