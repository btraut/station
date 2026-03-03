import { withRepository } from '../core/runtime.js';

export async function addLabel(issueId: string, name: string): Promise<void> {
  await withRepository((repo) => {
    repo.addLabel(issueId, name);
  });
}

export async function removeLabel(issueId: string, name: string): Promise<void> {
  await withRepository((repo) => {
    repo.removeLabel(issueId, name);
  });
}

export async function listLabels(issueId: string): Promise<string[]> {
  return withRepository((repo) => repo.listLabels(issueId));
}

export async function listAllLabels(): Promise<string[]> {
  return withRepository((repo) => repo.listAllLabels());
}
