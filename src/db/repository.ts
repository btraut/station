import type { Database } from 'better-sqlite3';
import type { Dependency, DependencyType, Issue, IssueStatus } from '../core/models.js';
import { StationError } from '../core/errors.js';

export type CreateIssueInput = {
  id: string;
  type: string;
  priority: number;
  status?: IssueStatus;
  title: string;
  description?: string | null;
  design?: string | null;
  notes?: string | null;
  acceptance?: string | null;
};

function rowToIssue(row: Record<string, unknown>): Issue {
  return {
    id: String(row.id),
    type: String(row.type),
    priority: Number(row.priority),
    status: row.status as IssueStatus,
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    design: (row.design as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    acceptance: (row.acceptance as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    closedAt: (row.closed_at as string | null) ?? null
  };
}

export class StationRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  createIssue(input: CreateIssueInput): Issue {
    const now = new Date().toISOString();
    const status = input.status ?? 'open';

    this.db
      .prepare(
        `
      INSERT INTO issues (
        id, type, priority, status, title, description, design, notes, acceptance, created_at, updated_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        input.id,
        input.type,
        input.priority,
        status,
        input.title,
        input.description ?? null,
        input.design ?? null,
        input.notes ?? null,
        input.acceptance ?? null,
        now,
        now,
        status === 'closed' ? now : null
      );

    return this.getIssueOrThrow(input.id);
  }

  getIssue(id: string): Issue | null {
    const row = this.db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? rowToIssue(row) : null;
  }

  getIssueOrThrow(id: string): Issue {
    const issue = this.getIssue(id);
    if (!issue) {
      throw new StationError(`Issue not found: ${id}`, { code: 'ISSUE_NOT_FOUND', exitCode: 3 });
    }
    return issue;
  }

  updateIssue(id: string, patch: Partial<Omit<CreateIssueInput, 'id'>>): Issue {
    const current = this.getIssueOrThrow(id);
    const nextStatus = patch.status ?? current.status;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      UPDATE issues
      SET type = ?, priority = ?, status = ?, title = ?, description = ?, design = ?, notes = ?, acceptance = ?, updated_at = ?, closed_at = ?
      WHERE id = ?
      `
      )
      .run(
        patch.type ?? current.type,
        patch.priority ?? current.priority,
        nextStatus,
        patch.title ?? current.title,
        patch.description === undefined ? current.description : patch.description,
        patch.design === undefined ? current.design : patch.design,
        patch.notes === undefined ? current.notes : patch.notes,
        patch.acceptance === undefined ? current.acceptance : patch.acceptance,
        now,
        nextStatus === 'closed' ? now : null,
        id
      );

    return this.getIssueOrThrow(id);
  }

  listIssues(): Issue[] {
    const rows = this.db
      .prepare('SELECT * FROM issues ORDER BY created_at ASC, id ASC')
      .all() as Record<string, unknown>[];
    return rows.map(rowToIssue);
  }

  addDependency(dependency: Dependency): void {
    this.getIssueOrThrow(dependency.issueId);
    this.getIssueOrThrow(dependency.dependsOnId);

    this.db
      .prepare(
        'INSERT OR IGNORE INTO dependencies(issue_id, depends_on_id, dep_type, created_at) VALUES (?, ?, ?, ?)'
      )
      .run(
        dependency.issueId,
        dependency.dependsOnId,
        dependency.type,
        new Date().toISOString()
      );
  }

  removeDependency(issueId: string, dependsOnId: string, type: DependencyType): void {
    this.db
      .prepare('DELETE FROM dependencies WHERE issue_id = ? AND depends_on_id = ? AND dep_type = ?')
      .run(issueId, dependsOnId, type);
  }

  listDependencies(issueId: string): Dependency[] {
    const rows = this.db
      .prepare('SELECT issue_id, depends_on_id, dep_type FROM dependencies WHERE issue_id = ? ORDER BY depends_on_id ASC')
      .all(issueId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      issueId: String(row.issue_id),
      dependsOnId: String(row.depends_on_id),
      type: row.dep_type as DependencyType
    }));
  }

  upsertLabel(name: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO labels(name, created_at) VALUES (?, ?)')
      .run(name, new Date().toISOString());
  }

  addLabel(issueId: string, label: string): void {
    this.getIssueOrThrow(issueId);
    this.upsertLabel(label);

    this.db
      .prepare('INSERT OR IGNORE INTO issue_labels(issue_id, label_name, created_at) VALUES (?, ?, ?)')
      .run(issueId, label, new Date().toISOString());
  }

  removeLabel(issueId: string, label: string): void {
    this.db
      .prepare('DELETE FROM issue_labels WHERE issue_id = ? AND label_name = ?')
      .run(issueId, label);
  }

  listLabels(issueId: string): string[] {
    const rows = this.db
      .prepare('SELECT label_name FROM issue_labels WHERE issue_id = ? ORDER BY label_name ASC')
      .all(issueId) as Array<Record<string, unknown>>;

    return rows.map((row) => String(row.label_name));
  }

  listAllLabels(): string[] {
    const rows = this.db
      .prepare('SELECT name FROM labels ORDER BY name ASC')
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => String(row.name));
  }
}
