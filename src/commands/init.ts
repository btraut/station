import { Command } from 'commander';
import { success } from '../core/output.js';
import { initializeStation } from '../services/system.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize station repo-local state in .station/')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const wantsJson = process.argv.includes('--json');
      const initialized = await initializeStation();

      if (wantsJson) {
        process.stdout.write(`${JSON.stringify(success(initialized), null, 2)}\n`);
        return;
      }

      process.stdout.write(`Initialized Station in ${initialized.stationDir}\n`);
    });
}
