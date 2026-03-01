import { Command } from 'commander';
import { ensureStationLayout, resolveStationPaths } from '../core/paths.js';
import { success } from '../core/output.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize station repo-local state in .station/')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const wantsJson = process.argv.includes("--json");
      const paths = await resolveStationPaths();
      await ensureStationLayout(paths);

      if (wantsJson) {
        process.stdout.write(
          `${JSON.stringify(success({ initialized: true, stationDir: paths.stationDir }), null, 2)}\n`
        );
        return;
      }

      process.stdout.write(`Initialized Station in ${paths.stationDir}\n`);
    });
}
