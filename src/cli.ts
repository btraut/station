#!/usr/bin/env node
import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerInfoCommand } from './commands/info.js';
import { registerIssueCommands } from './commands/issues.js';
import { registerDependencyCommands } from './commands/deps.js';
import { registerLabelCommands } from './commands/labels.js';
import { failure, printJson } from './core/output.js';
import { isStationError, StationError } from './core/errors.js';

const EXCLUDED_V1_FAMILIES = new Set([
  'sync',
  'daemon',
  'import',
  'export',
  'migrate',
  'admin',
  'agents',
  'worktrees',
  'gates',
  'chemistry'
]);

function enforceV1Scope(argv: string[]): void {
  const firstCommand = argv[2];
  if (!firstCommand) {
    return;
  }

  if (EXCLUDED_V1_FAMILIES.has(firstCommand)) {
    throw new StationError(`'${firstCommand}' is intentionally out of scope in Station v1`, {
      code: 'V1_SCOPE_EXCLUDED',
      details: {
        family: firstCommand,
        deferredFamilies: Array.from(EXCLUDED_V1_FAMILIES).sort()
      },
      exitCode: 2
    });
  }
}

const program = new Command();
program
  .name('station')
  .description('Station CLI - repo-scoped single-user issue tracking')
  .option('--json', 'Output machine-readable JSON envelope for top-level errors', false)
  .showHelpAfterError();

registerInitCommand(program);
registerInfoCommand(program);
registerIssueCommands(program);
registerDependencyCommands(program);
registerLabelCommands(program);

Promise.resolve()
  .then(() => enforceV1Scope(process.argv))
  .then(() => program.parseAsync(process.argv))
  .catch((error: unknown) => {
    if (isStationError(error)) {
      printJson(failure(error.code, error.message, error.details));
      process.exit(error.exitCode);
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    printJson(failure('UNHANDLED_ERROR', message));
    process.exit(1);
  });
