# Station

Station is a repo-scoped, single-user issue tracker CLI with Beads-like ergonomics and a pluggable backend foundation.

## Status

- v1 backend: SQLite (active)
- Stub backends: Linear, Asana (explicitly unsupported in v1)
- MCP interface: stdio (`station mcp`) with no daemon (active)
- Collaboration/ops command families: intentionally excluded in v1

## Requirements

- Node 20+
- A git repository (Station is repo-scoped)

## Install

```bash
npm i -g @btraut/station
station --help
station skill install
station mcp install
```

## Quickstart

```bash
cd /path/to/git/repo
station init
station create --title "Ship v1"
station list
station ready
```

## Repo-Scoped Model

Station stores state in your repository's git common dir so all worktrees share one source of truth.

```text
<git-common-dir>/station/
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
      "id": "station-7f593361-8b58-4dd0-a5af-8bf8f80a6ff5",
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
- `station skill install [--client <id...>]`
- `station skill status`
- `station create --title <title> [--type] [--priority] [--description] [--design] [--notes] [--acceptance] [--status]`
- `station list [--status csv] [--priority csv] [--type csv] [--ids csv] [--labels-any csv] [--labels-all csv] [--query text]`
- `station show <id>`
- `station update <id> [--title] [--type] [--priority] [--status] [--description] [--design] [--notes] [--acceptance]`
- `station close <id>`
- `station reopen <id>`
- `station open <id>` (alias for `reopen`)
- `station ready`
- `station mcp [--name <name>] [--version <version>]`
- `station mcp install`
- `station mcp status`

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

## MCP Interface (Daemon-Free)

Station v1 does not run a background daemon. MCP support is a local stdio server started directly by the `station` binary:

- Easiest option: `station mcp install`
- MCP entrypoint: `station mcp`
- Runtime model: one foreground stdio process per client connection
- No `stationd` process, no background lifecycle management

### Parity Policy

MCP tools mirror CLI semantics and aliases. Business logic is shared between CLI and MCP adapters.

Current tool names:

- Core: `init`, `info`, `create`, `list`, `show`, `update`, `close`, `reopen`, `open`, `ready`
- Dependencies: `dep.add`, `dep.remove`, `dep.list`, `dep.tree`
- Labels: `label.add`, `label.remove`, `label.list`, `label.list-all`

Tool results use the same Station envelope shape as CLI JSON output:

- Success: `{ "ok": true, "data": ... }`
- Error: `{ "ok": false, "error": { "code", "message", "details?" } }`

### Example MCP Client Config (Codex)

```toml
[mcp_servers.station]
command = "station"
args = ["mcp"]
```

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

Recommended:

```bash
station skill install
```

Manual copy (advanced):

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
