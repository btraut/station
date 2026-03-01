import { Command } from 'commander';
import { StationError } from '../core/errors.js';
import { success } from '../core/output.js';
import { withRepository, wantsJson } from '../core/runtime.js';
import type { IssueStatus } from '../core/models.js';
import type { IssueFilters } from '../db/repository.js';

const VALID_STATUSES: IssueStatus[] = ['open', 'in_progress', 'closed'];

function nextIssueId(existingIds: string[]): string {
  const numbers = existingIds
    .map((id) => {
      const match = /^station-(\d+)$/.exec(id);
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => value !== null);

  if (numbers.length === 0) {
    return 'station-1';
  }

  return `station-${Math.max(...numbers) + 1}`;
}

function parseCsv(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function validateStatus(value: string | undefined): IssueStatus | undefined {
  if (!value) {
    return undefined;
  }
  if (!VALID_STATUSES.includes(value as IssueStatus)) {
    throw new StationError(`Invalid status: ${value}`, {
      code: 'INVALID_STATUS',
      details: { allowed: VALID_STATUSES }
    });
  }
  return value as IssueStatus;
}

function parsePriority(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 4) {
    throw new StationError('Priority must be an integer between 0 and 4', {
      code: 'INVALID_PRIORITY',
      details: { value }
    });
  }
  return parsed;
}

function parseIssueFilters(options: Record<string, string | undefined>): IssueFilters {
  const statuses = (parseCsv(options.status) ?? []).map((value) => validateStatus(value) as IssueStatus);
  const priorities = (parseCsv(options.priority) ?? []).map((value) => parsePriority(value) as number);

  return {
    ids: parseCsv(options.ids),
    statuses,
    priorities,
    types: parseCsv(options.type),
    labelsAny: parseCsv(options.labelsAny),
    labelsAll: parseCsv(options.labelsAll),
    query: options.query
  };
}

function registerReopenLikeCommand(program: Command, name: 'reopen' | 'open', description: string): void {
  program
    .command(`${name} <id>`)
    .description(description)
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (id: string) => {
      const issue = await withRepository((repo) => repo.updateIssue(id, { status: 'open' }));

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issue }), null, 2)}\n`);
        return;
      }

      process.stdout.write(`Reopened ${issue.id}\n`);
    });
}

export function registerIssueCommands(program: Command): void {
  program
    .command('create')
    .description('Create a new issue')
    .requiredOption('--title <title>', 'Issue title')
    .option('--id <id>', 'Issue id (auto-generated if omitted)')
    .option('--type <type>', 'Issue type', 'task')
    .option('--priority <priority>', 'Issue priority (0-4)', '2')
    .option('--description <description>', 'Issue description')
    .option('--design <design>', 'Issue design notes')
    .option('--notes <notes>', 'Issue implementation notes')
    .option('--acceptance <acceptance>', 'Issue acceptance criteria')
    .option('--status <status>', 'Issue status (open|in_progress|closed)', 'open')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (options) => {
      const created = await withRepository((repo) => {
        const id = options.id ?? nextIssueId(repo.listIssues().map((issue) => issue.id));
        const status = validateStatus(options.status) ?? 'open';
        const priority = parsePriority(options.priority) ?? 2;

        return repo.createIssue({
          id,
          type: options.type,
          priority,
          status,
          title: options.title,
          description: options.description,
          design: options.design,
          notes: options.notes,
          acceptance: options.acceptance
        });
      });

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issue: created }), null, 2)}\n`);
        return;
      }

      process.stdout.write(`Created ${created.id}: ${created.title}\n`);
    });

  program
    .command('list')
    .description('List issues')
    .option('--status <csv>', 'Filter by status (csv)')
    .option('--priority <csv>', 'Filter by priority (csv 0-4)')
    .option('--type <csv>', 'Filter by type (csv)')
    .option('--ids <csv>', 'Filter by issue ids (csv)')
    .option('--labels-any <csv>', 'Filter by labels (any match)')
    .option('--labels-all <csv>', 'Filter by labels (all must match)')
    .option('--query <query>', 'Filter by text search in title/description/notes')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (options) => {
      const filters = parseIssueFilters({
        status: options.status,
        priority: options.priority,
        type: options.type,
        ids: options.ids,
        labelsAny: options.labelsAny,
        labelsAll: options.labelsAll,
        query: options.query
      });

      const issues = await withRepository((repo) => repo.listIssues(filters));

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issues }), null, 2)}\n`);
        return;
      }

      if (issues.length === 0) {
        process.stdout.write('No issues\n');
        return;
      }

      for (const issue of issues) {
        process.stdout.write(`${issue.id} [${issue.status}] ${issue.title}\n`);
      }
    });

  program
    .command('show <id>')
    .description('Show a single issue')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (id: string) => {
      const issue = await withRepository((repo) => repo.getIssueOrThrow(id));

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issue }), null, 2)}\n`);
        return;
      }

      process.stdout.write(`${issue.id} ${issue.title}\n`);
      process.stdout.write(`status: ${issue.status}\n`);
      process.stdout.write(`priority: ${issue.priority}\n`);
      process.stdout.write(`type: ${issue.type}\n`);
    });

  program
    .command('update <id>')
    .description('Update issue fields')
    .option('--title <title>', 'Issue title')
    .option('--type <type>', 'Issue type')
    .option('--priority <priority>', 'Issue priority (0-4)')
    .option('--status <status>', 'Issue status (open|in_progress|closed)')
    .option('--description <description>', 'Issue description')
    .option('--design <design>', 'Issue design notes')
    .option('--notes <notes>', 'Issue implementation notes')
    .option('--acceptance <acceptance>', 'Issue acceptance criteria')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (id: string, options) => {
      if (
        options.title === undefined &&
        options.type === undefined &&
        options.priority === undefined &&
        options.status === undefined &&
        options.description === undefined &&
        options.design === undefined &&
        options.notes === undefined &&
        options.acceptance === undefined
      ) {
        throw new StationError('No fields supplied. Provide at least one --field option.', {
          code: 'NO_UPDATE_FIELDS'
        });
      }

      const updated = await withRepository((repo) =>
        repo.updateIssue(id, {
          title: options.title,
          type: options.type,
          priority: parsePriority(options.priority),
          status: validateStatus(options.status),
          description: options.description,
          design: options.design,
          notes: options.notes,
          acceptance: options.acceptance
        })
      );

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issue: updated }), null, 2)}\n`);
        return;
      }

      process.stdout.write(`Updated ${updated.id}\n`);
    });

  program
    .command('close <id>')
    .description('Close an issue')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (id: string) => {
      const issue = await withRepository((repo) => repo.updateIssue(id, { status: 'closed' }));

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ issue }), null, 2)}\n`);
        return;
      }

      process.stdout.write(`Closed ${issue.id}\n`);
    });

  registerReopenLikeCommand(program, 'reopen', 'Reopen a closed issue');
  registerReopenLikeCommand(program, 'open', 'Alias for reopen');
}
