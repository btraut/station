import { Command } from 'commander';
import { success } from '../core/output.js';
import { wantsJson } from '../core/runtime.js';
import {
  addDependency,
  listDependencies,
  listDependencyTree,
  listReadyIssues,
  removeDependency
} from '../services/dependencies.js';

export function registerDependencyCommands(program: Command): void {
  const dep = program.command('dep').description('Dependency graph commands');

  dep
    .command('add <issueId> <dependsOnId>')
    .description('Add dependency edge (issueId depends on dependsOnId)')
    .option('--type <type>', 'Dependency type', 'blocks')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string, dependsOnId: string, options) => {
      const dependency = await addDependency(issueId, dependsOnId, options.type);

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ dependency }), null, 2)}\n`);
        return;
      }

      process.stdout.write(`Added ${dependency.type} dependency: ${issueId} -> ${dependsOnId}\n`);
    });

  dep
    .command('remove <issueId> <dependsOnId>')
    .description('Remove dependency edge')
    .option('--type <type>', 'Dependency type', 'blocks')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string, dependsOnId: string, options) => {
      const dependency = await removeDependency(issueId, dependsOnId, options.type);

      if (wantsJson()) {
        process.stdout.write(
          `${JSON.stringify(success({ removed: true, dependency }), null, 2)}\n`
        );
        return;
      }

      process.stdout.write(`Removed ${dependency.type} dependency: ${issueId} -> ${dependsOnId}\n`);
    });

  dep
    .command('list [issueId]')
    .description('List dependency edges')
    .option('--type <type>', 'Dependency type filter')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string | undefined, options) => {
      const dependencies = await listDependencies(issueId, options.type);

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
      const dependencies = await listDependencyTree(issueId, options.type);

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
      const issues = await listReadyIssues();

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
