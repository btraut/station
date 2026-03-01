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

export type IssueFilters = {
  ids?: string[];
  statuses?: IssueStatus[];
  priorities?: number[];
  types?: string[];
  query?: string;
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

  listIssues(filters?: IssueFilters): Issue[] {
    const where: string[] = [];
    const values: unknown[] = [];

    if (filters?.ids && filters.ids.length > 0) {
      where.push(`id IN (${filters.ids.map(() => '?').join(', ')})`);
      values.push(...filters.ids);
    }

    if (filters?.statuses && filters.statuses.length > 0) {
      where.push(`status IN (${filters.statuses.map(() => '?').join(', ')})`);
      values.push(...filters.statuses);
    }

    if (filters?.priorities && filters.priorities.length > 0) {
      where.push(`priority IN (${filters.priorities.map(() => '?').join(', ')})`);
      values.push(...filters.priorities);
    }

    if (filters?.types && filters.types.length > 0) {
      where.push(`type IN (${filters.types.map(() => '?').join(', ')})`);
      values.push(...filters.types);
    }

    if (filters?.query) {
      where.push('(title LIKE ? OR COALESCE(description, \'\') LIKE ? OR COALESCE(notes, \'\') LIKE ?)');
      const query = `%${filters.query}%`;
      values.push(query, query, query);
    }

    const whereClause = where.length === 0 ? '' : `WHERE ${where.join(' AND ')}`;
    const rows = this.db
      .prepare(`SELECT * FROM issues ${whereClause} ORDER BY priority ASC, created_at ASC, id ASC`)
      .all(...values) as Record<string, unknown>[];

    return rows.map(rowToIssue);
  }

  addDependency(dependency: Dependency): void {
    this.getIssueOrThrow(dependency.issueId);
    this.getIssueOrThrow(dependency.dependsOnId);

    if (dependency.issueId === dependency.dependsOnId) {
      throw new StationError('An issue cannot depend on itself', {
        code: 'DEPENDENCY_SELF_REFERENCE'
      });
    }

    if (this.wouldCreateCycle(dependency.issueId, dependency.dependsOnId, dependency.type)) {
      throw new StationError('Dependency would create a cycle', {
        code: 'DEPENDENCY_CYCLE',
        details: dependency
      });
    }

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

  listDependencies(issueId?: string, type?: DependencyType): Dependency[] {
    const where: string[] = [];
    const values: unknown[] = [];

    if (issueId) {
      where.push('issue_id = ?');
      values.push(issueId);
    }

    if (type) {
      where.push('dep_type = ?');
      values.push(type);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const rows = this.db
      .prepare(
        `SELECT issue_id, depends_on_id, dep_type FROM dependencies ${whereClause} ORDER BY issue_id ASC, depends_on_id ASC`
      )
      .all(...values) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      issueId: String(row.issue_id),
      dependsOnId: String(row.depends_on_id),
      type: row.dep_type as DependencyType
    }));
  }

  listDependencyTree(issueId: string, type: DependencyType): Dependency[] {
    this.getIssueOrThrow(issueId);

    const rows = this.db
      .prepare(
        `
        WITH RECURSIVE dep_tree(issue_id, depends_on_id, dep_type) AS (
          SELECT issue_id, depends_on_id, dep_type
          FROM dependencies
          WHERE issue_id = ? AND dep_type = ?
          UNION ALL
          SELECT d.issue_id, d.depends_on_id, d.dep_type
          FROM dependencies d
          INNER JOIN dep_tree t ON d.issue_id = t.depends_on_id
          WHERE d.dep_type = ?
        )
        SELECT DISTINCT issue_id, depends_on_id, dep_type FROM dep_tree
        ORDER BY issue_id ASC, depends_on_id ASC
      `
      )
      .all(issueId, type, type) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      issueId: String(row.issue_id),
      dependsOnId: String(row.depends_on_id),
      type: row.dep_type as DependencyType
    }));
  }

  listReadyIssues(): Issue[] {
    const rows = this.db
      .prepare(
        `
        SELECT i.*
        FROM issues i
        WHERE i.status != 'closed'
          AND NOT EXISTS (
            SELECT 1
            FROM dependencies d
            JOIN issues blockers ON blockers.id = d.depends_on_id
            WHERE d.issue_id = i.id
              AND d.dep_type = 'blocks'
              AND blockers.status != 'closed'
          )
        ORDER BY i.priority ASC, i.created_at ASC, i.id ASC
      `
      )
      .all() as Record<string, unknown>[];

    return rows.map(rowToIssue);
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

  private wouldCreateCycle(issueId: string, dependsOnId: string, type: DependencyType): boolean {
    const row = this.db
      .prepare(
        `
        WITH RECURSIVE walk(issue_id, depends_on_id) AS (
          SELECT issue_id, depends_on_id
          FROM dependencies
          WHERE issue_id = ? AND dep_type = ?
          UNION ALL
          SELECT d.issue_id, d.depends_on_id
          FROM dependencies d
          JOIN walk w ON d.issue_id = w.depends_on_id
          WHERE d.dep_type = ?
        )
        SELECT 1 as found
        FROM walk
        WHERE depends_on_id = ?
        LIMIT 1
      `
      )
      .get(dependsOnId, type, type, issueId) as { found?: number } | undefined;

    return row?.found === 1;
  }
}
