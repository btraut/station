import { Command } from 'commander';
import { success } from '../core/output.js';
import { wantsJson } from '../core/runtime.js';
import { addLabel, listAllLabels, listLabels, removeLabel } from '../services/labels.js';

export function registerLabelCommands(program: Command): void {
  const label = program.command('label').description('Issue label commands');

  label
    .command('add <issueId> <name>')
    .description('Attach a label to an issue')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string, name: string) => {
      await addLabel(issueId, name);

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issueId, label: name, added: true }), null, 2)}\n`);
        return;
      }

      process.stdout.write(`Added label ${name} to ${issueId}\n`);
    });

  label
    .command('remove <issueId> <name>')
    .description('Remove a label from an issue')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string, name: string) => {
      await removeLabel(issueId, name);

      if (wantsJson()) {
        process.stdout.write(
          `${JSON.stringify(success({ issueId, label: name, removed: true }), null, 2)}\n`
        );
        return;
      }

      process.stdout.write(`Removed label ${name} from ${issueId}\n`);
    });

  label
    .command('list <issueId>')
    .description('List labels attached to an issue')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (issueId: string) => {
      const labels = await listLabels(issueId);

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issueId, labels }), null, 2)}\n`);
        return;
      }

      if (labels.length === 0) {
        process.stdout.write('No labels\n');
        return;
      }

      for (const entry of labels) {
        process.stdout.write(`${entry}\n`);
      }
    });

  label
    .command('list-all')
    .description('List all known labels in this repo')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const labels = await listAllLabels();

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ labels }), null, 2)}\n`);
        return;
      }

      if (labels.length === 0) {
        process.stdout.write('No labels\n');
        return;
      }

      for (const entry of labels) {
        process.stdout.write(`${entry}\n`);
      }
    });
}
