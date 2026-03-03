import type { Issue } from '../core/models.js';
import { StationError } from '../core/errors.js';
import { parseIssueFilters, parseIssueStatus, parsePriority } from '../core/cli-parsers.js';
import { withRepository } from '../core/runtime.js';

type CreateIssueOptions = {
  id?: string;
  type?: string;
  priority?: string;
  title: string;
  description?: string;
  design?: string;
  notes?: string;
  acceptance?: string;
  status?: string;
};

type UpdateIssueOptions = {
  title?: string;
  type?: string;
  priority?: string;
  status?: string;
  description?: string;
  design?: string;
  notes?: string;
  acceptance?: string;
};

type ListIssueOptions = {
  status?: string;
  priority?: string;
  type?: string;
  ids?: string;
  labelsAny?: string;
  labelsAll?: string;
  query?: string;
};

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

export async function createIssue(options: CreateIssueOptions): Promise<Issue> {
  return withRepository((repo) => {
    const id = options.id ?? nextIssueId(repo.listIssues().map((issue) => issue.id));
    const status = parseIssueStatus(options.status) ?? 'open';
    const priority = parsePriority(options.priority) ?? 2;

    return repo.createIssue({
      id,
      type: options.type ?? 'task',
      priority,
      status,
      title: options.title,
      description: options.description,
      design: options.design,
      notes: options.notes,
      acceptance: options.acceptance
    });
  });
}

export async function listIssues(options: ListIssueOptions): Promise<Issue[]> {
  const filters = parseIssueFilters({
    status: options.status,
    priority: options.priority,
    type: options.type,
    ids: options.ids,
    labelsAny: options.labelsAny,
    labelsAll: options.labelsAll,
    query: options.query
  });
  return withRepository((repo) => repo.listIssues(filters));
}

export async function showIssue(id: string): Promise<Issue> {
  return withRepository((repo) => repo.getIssueOrThrow(id));
}

export async function updateIssue(id: string, options: UpdateIssueOptions): Promise<Issue> {
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

  return withRepository((repo) =>
    repo.updateIssue(id, {
      title: options.title,
      type: options.type,
      priority: parsePriority(options.priority),
      status: parseIssueStatus(options.status),
      description: options.description,
      design: options.design,
      notes: options.notes,
      acceptance: options.acceptance
    })
  );
}

export async function closeIssue(id: string): Promise<Issue> {
  return withRepository((repo) => repo.updateIssue(id, { status: 'closed' }));
}

export async function reopenIssue(id: string): Promise<Issue> {
  return withRepository((repo) => repo.updateIssue(id, { status: 'open' }));
}
