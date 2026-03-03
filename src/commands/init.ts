import { Command } from 'commander';
import { ensureStationLayout, resolveStationPaths } from '../core/paths.js';
import { success } from '../core/output.js';
import { ensureDatabase } from '../db/database.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize station state in the git common dir')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const wantsJson = process.argv.includes('--json');
      const paths = await resolveStationPaths();
      await ensureStationLayout(paths);
      await ensureDatabase(paths.dbPath);

      if (wantsJson) {
        process.stdout.write(
          `${JSON.stringify(success({ initialized: true, stationDir: paths.stationDir, dbPath: paths.dbPath }), null, 2)}\n`
        );
        return;
      }

      process.stdout.write(`Initialized Station in ${paths.stationDir}\n`);
    });
}
