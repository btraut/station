import type { Dependency } from '../core/models.js';
import { parseDependencyType } from '../core/cli-parsers.js';
import { withRepository } from '../core/runtime.js';

export async function addDependency(
  issueId: string,
  dependsOnId: string,
  rawType?: string
): Promise<Dependency> {
  const type = parseDependencyType(rawType);
  await withRepository((repo) => {
    repo.addDependency({ issueId, dependsOnId, type });
  });
  return { issueId, dependsOnId, type };
}

export async function removeDependency(
  issueId: string,
  dependsOnId: string,
  rawType?: string
): Promise<Dependency> {
  const type = parseDependencyType(rawType);
  await withRepository((repo) => {
    repo.removeDependency(issueId, dependsOnId, type);
  });
  return { issueId, dependsOnId, type };
}

export async function listDependencies(issueId?: string, rawType?: string): Promise<Dependency[]> {
  const type = rawType ? parseDependencyType(rawType) : undefined;
  return withRepository((repo) => repo.listDependencies(issueId, type));
}

export async function listDependencyTree(issueId: string, rawType?: string): Promise<Dependency[]> {
  const type = parseDependencyType(rawType);
  return withRepository((repo) => repo.listDependencyTree(issueId, type));
}

export async function listReadyIssues() {
  return withRepository((repo) => repo.listReadyIssues());
}
