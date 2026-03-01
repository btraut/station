import type { Database } from 'better-sqlite3';

export const CURRENT_SCHEMA_VERSION = 1;

type Migration = {
  version: number;
  statements: string[];
};

const migrations: Migration[] = [
  {
    version: 1,
    statements: [
      `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        priority INTEGER NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        design TEXT,
        notes TEXT,
        acceptance TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        closed_at TEXT
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS dependencies (
        issue_id TEXT NOT NULL,
        depends_on_id TEXT NOT NULL,
        dep_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(issue_id, depends_on_id, dep_type),
        FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE,
        FOREIGN KEY(depends_on_id) REFERENCES issues(id) ON DELETE CASCADE
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS labels (
        name TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS issue_labels (
        issue_id TEXT NOT NULL,
        label_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(issue_id, label_name),
        FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE,
        FOREIGN KEY(label_name) REFERENCES labels(name) ON DELETE CASCADE
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id TEXT,
        event_type TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE
      )
      `,
      'CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)',
      'CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority)',
      'CREATE INDEX IF NOT EXISTS idx_dependencies_issue_id ON dependencies(issue_id)',
      'CREATE INDEX IF NOT EXISTS idx_issue_labels_issue_id ON issue_labels(issue_id)'
    ]
  }
];

export function runMigrations(db: Database): void {
  db.pragma('foreign_keys = ON');

  const createMigrationTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  createMigrationTable.run();

  const appliedVersions = new Set<number>(
    db
      .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
      .all()
      .map((row: unknown) => (row as { version: number }).version)
  );

  const insertMigration = db.prepare(
    'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)'
  );

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    const apply = db.transaction(() => {
      for (const statement of migration.statements) {
        db.prepare(statement).run();
      }
      insertMigration.run(migration.version, new Date().toISOString());
    });

    apply();
  }
}
