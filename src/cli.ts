#!/usr/bin/env node
import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerInfoCommand } from './commands/info.js';
import { failure, printJson } from './core/output.js';
import { isStationError } from './core/errors.js';

const program = new Command();
program
  .name('station')
  .description('Station CLI - repo-scoped single-user issue tracking')
  .option('--json', 'Output machine-readable JSON envelope for top-level errors', false)
  .showHelpAfterError();

registerInitCommand(program);
registerInfoCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  if (isStationError(error)) {
    printJson(failure(error.code, error.message, error.details));
    process.exit(error.exitCode);
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  printJson(failure('UNHANDLED_ERROR', message));
  process.exit(1);
});
