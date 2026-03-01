export type IssueStatus = 'open' | 'in_progress' | 'closed';

export type Issue = {
  id: string;
  type: string;
  priority: number;
  status: IssueStatus;
  title: string;
  description: string | null;
  design: string | null;
  notes: string | null;
  acceptance: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type DependencyType = 'blocks' | 'related' | 'discovered_from' | 'child';

export type Dependency = {
  issueId: string;
  dependsOnId: string;
  type: DependencyType;
};
