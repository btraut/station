PRAGMA foreign_keys = OFF;

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT INTO schema_migrations(version, applied_at)
VALUES (0, '2025-12-31T23:59:59.000Z');

CREATE TABLE legacy_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL
);
