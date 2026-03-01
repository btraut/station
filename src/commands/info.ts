import { Command } from 'commander';
import { ensureStationLayout, readConfig, resolveStationPaths } from '../core/paths.js';
import { success } from '../core/output.js';

export function registerInfoCommand(program: Command): void {
  program
    .command('info')
    .description('Show current station configuration')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const wantsJson = process.argv.includes("--json");
      const paths = await resolveStationPaths();
      await ensureStationLayout(paths);
      const config = await readConfig(paths);

      const payload = {
        repoRoot: paths.repoRoot,
        stationDir: paths.stationDir,
        dbPath: paths.dbPath,
        config
      };

      if (wantsJson) {
        process.stdout.write(`${JSON.stringify(success(payload), null, 2)}\n`);
        return;
      }

      process.stdout.write(`repoRoot: ${payload.repoRoot}\n`);
      process.stdout.write(`stationDir: ${payload.stationDir}\n`);
      process.stdout.write(`dbPath: ${payload.dbPath}\n`);
      process.stdout.write(`backend: ${payload.config.backend}\n`);
    });
}
