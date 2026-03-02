# Station

Station is a repo-scoped, single-user issue tracker CLI with Beads-like ergonomics and a pluggable backend foundation.

## Status

- v1 backend: SQLite (active)
- Stub backends: Linear, Asana (explicitly unsupported in v1)
- Collaboration/ops command families: intentionally excluded in v1

## Requirements

- Node 20+
- A git repository (Station is repo-local)

## Install

```bash
npm install
npm run build
npm link
```

## Quickstart

```bash
cd /path/to/git/repo
station init
station create --title "Ship v1"
station list
station ready
```

## Repo-Local Model

Station stores state inside your repo at `.station/`.

```text
.station/
  config.json
  station.db
  station.lock
```

## JSON Output

Every command supports `--json`.

Example (`station create --title "Ship v1" --json`):

```json
{
  "ok": true,
  "data": {
    "issue": {
      "id": "station-1",
      "type": "task",
      "priority": 2,
      "status": "open",
      "title": "Ship v1",
      "description": null,
      "design": null,
      "notes": null,
      "acceptance": null,
      "createdAt": "2026-03-01T09:00:00.000Z",
      "updatedAt": "2026-03-01T09:00:00.000Z",
      "closedAt": null
    }
  }
}
```

Example error (`station sync --json`):

```json
{
  "ok": false,
  "error": {
    "code": "V1_SCOPE_EXCLUDED",
    "message": "'sync' is intentionally out of scope in Station v1",
    "details": {
      "family": "sync",
      "deferredFamilies": [
        "admin",
        "agents",
        "chemistry",
        "daemon",
        "export",
        "gates",
        "import",
        "migrate",
        "sync",
        "worktrees"
      ]
    }
  }
}
```

## Command Reference (v1)

### Core

- `station init`
- `station info`
- `station -v` / `station --version`
- `station create --title <title> [--type] [--priority] [--description] [--design] [--notes] [--acceptance] [--status]`
- `station list [--status csv] [--priority csv] [--type csv] [--ids csv] [--labels-any csv] [--labels-all csv] [--query text]`
- `station show <id>`
- `station update <id> [--title] [--type] [--priority] [--status] [--description] [--design] [--notes] [--acceptance]`
- `station close <id>`
- `station reopen <id>`
- `station open <id>` (alias for `reopen`)
- `station ready`

### Dependencies

- `station dep add <issueId> <dependsOnId> [--type blocks|related|discovered_from|child]`
- `station dep remove <issueId> <dependsOnId> [--type ...]`
- `station dep list [issueId] [--type ...]`
- `station dep tree <issueId> [--type ...]`

### Labels

- `station label add <issueId> <name>`
- `station label remove <issueId> <name>`
- `station label list <issueId>`
- `station label list-all`

## Included vs Excluded

See the full parity table: [`docs/parity-matrix.md`](docs/parity-matrix.md).

Included in v1:

- init/info
- issue lifecycle
- dependency graph + ready queue
- labels + list filters

Excluded in v1:

- sync/daemon/import-export/migrate/admin/agents/worktrees/gates/chemistry
- multi-user collaboration workflows

## Agent Skill

This repo includes an installable Station agent skill at [`skills/station`](skills/station).

Copy it into your skills directory:

```bash
cp -r skills/station ~/.agents/skills/
```

## Development

```bash
npm run lint
npm run typecheck
npm test
```

Testing pyramid, layer ownership, and runtime budgets: [`docs/testing.md`](docs/testing.md).
