import { Command } from 'commander';
import type { DependencyType } from '../core/models.js';
import { StationError } from '../core/errors.js';
import { success } from '../core/output.js';
import { withRepository, wantsJson } from '../core/runtime.js';

const DEP_TYPES: DependencyType[] = ['blocks', 'related', 'discovered_from', 'child'];

function parseType(value?: string): DependencyType {
  if (!value) {
    return 'blocks';
  }

  if (!DEP_TYPES.includes(value as DependencyType)) {
    throw new StationError(`Invalid dependency type: ${value}`, {
      code: 'INVALID_DEPENDENCY_TYPE',
      details: { allowed: DEP_TYPES }
    });
  }

  return value as DependencyType;
}

export function registerDependencyCommands(program: Command): void {
  const dep = program.command('dep').description('Dependency graph commands');

  dep
    .command('add <issueId> <dependsOnId>')
    .description('Add dependency edge (issueId depends on dependsOnId)')
    .option('--type <type>', 'Dependency type', 'blocks')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string, dependsOnId: string, options) => {
      const type = parseType(options.type);

      await withRepository((repo) => {
        repo.addDependency({ issueId, dependsOnId, type });
      });

      if (wantsJson()) {
        process.stdout.write(
          `${JSON.stringify(success({ dependency: { issueId, dependsOnId, type } }), null, 2)}\n`
        );
        return;
      }

      process.stdout.write(`Added ${type} dependency: ${issueId} -> ${dependsOnId}\n`);
    });

  dep
    .command('remove <issueId> <dependsOnId>')
    .description('Remove dependency edge')
    .option('--type <type>', 'Dependency type', 'blocks')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string, dependsOnId: string, options) => {
      const type = parseType(options.type);

      await withRepository((repo) => {
        repo.removeDependency(issueId, dependsOnId, type);
      });

      if (wantsJson()) {
        process.stdout.write(
          `${JSON.stringify(success({ removed: true, dependency: { issueId, dependsOnId, type } }), null, 2)}\n`
        );
        return;
      }

      process.stdout.write(`Removed ${type} dependency: ${issueId} -> ${dependsOnId}\n`);
    });

  dep
    .command('list [issueId]')
    .description('List dependency edges')
    .option('--type <type>', 'Dependency type filter')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string | undefined, options) => {
      const type = options.type ? parseType(options.type) : undefined;
      const dependencies = await withRepository((repo) => repo.listDependencies(issueId, type));

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ dependencies }), null, 2)}\n`);
        return;
      }

      if (dependencies.length === 0) {
        process.stdout.write('No dependencies\n');
        return;
      }

      for (const depEntry of dependencies) {
        process.stdout.write(`${depEntry.issueId} -[${depEntry.type}]-> ${depEntry.dependsOnId}\n`);
      }
    });

  dep
    .command('tree <issueId>')
    .description('Show recursive dependency tree for an issue')
    .option('--type <type>', 'Dependency type', 'blocks')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string, options) => {
      const type = parseType(options.type);
      const dependencies = await withRepository((repo) => repo.listDependencyTree(issueId, type));

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ dependencies }), null, 2)}\n`);
        return;
      }

      if (dependencies.length === 0) {
        process.stdout.write('No dependencies\n');
        return;
      }

      for (const depEntry of dependencies) {
        process.stdout.write(`${depEntry.issueId} -[${depEntry.type}]-> ${depEntry.dependsOnId}\n`);
      }
    });

  program
    .command('ready')
    .description('List actionable unblocked issues')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const issues = await withRepository((repo) => repo.listReadyIssues());

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issues }), null, 2)}\n`);
        return;
      }

      if (issues.length === 0) {
        process.stdout.write('No ready issues\n');
        return;
      }

      for (const issue of issues) {
        process.stdout.write(`${issue.id} [${issue.status}] ${issue.title}\n`);
      }
    });
}
