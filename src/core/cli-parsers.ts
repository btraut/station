import { StationError } from './errors.js';
import type { DependencyType, IssueStatus } from './models.js';
import type { IssueFilters } from '../db/repository.js';

export const VALID_STATUSES: IssueStatus[] = ['open', 'in_progress', 'closed'];
export const VALID_DEPENDENCY_TYPES: DependencyType[] = ['blocks', 'related', 'discovered_from', 'child'];

export function parseCsv(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseIssueStatus(value: string | undefined): IssueStatus | undefined {
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

export function parsePriority(value: string | undefined): number | undefined {
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

export function parseIssueFilters(options: Record<string, string | undefined>): IssueFilters {
  const statuses = (parseCsv(options.status) ?? []).map((value) => parseIssueStatus(value) as IssueStatus);
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

export function parseDependencyType(value?: string): DependencyType {
  if (!value) {
    return 'blocks';
  }

  if (!VALID_DEPENDENCY_TYPES.includes(value as DependencyType)) {
    throw new StationError(`Invalid dependency type: ${value}`, {
      code: 'INVALID_DEPENDENCY_TYPE',
      details: { allowed: VALID_DEPENDENCY_TYPES }
    });
  }

  return value as DependencyType;
}
