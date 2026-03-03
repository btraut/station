---
name: station
description: >
  Repo-scoped issue tracker for multi-session work with dependencies and persistent
  memory across conversation compaction. Use when work spans sessions, has blockers,
  or needs context recovery after compaction.
allowed-tools: "Read,Bash(station:*)"
version: "0.1.0"
author: "btraut"
license: "MIT"
---

# Station - Persistent Task Memory for AI Agents

Git-backed-by-repo context, SQLite-backed state. Station gives agents durable work tracking that survives compaction.

## Station vs TodoWrite

| Station (persistent) | TodoWrite (ephemeral) |
|----------------------|------------------------|
| Multi-session work | Single-session tasks |
| Dependency graph | Linear checklist |
| Survives compaction | Conversation-scoped |
| Repo-scoped source of truth | Session-local scratchpad |

Decision test: "Will I need this context in 2 weeks?" If yes, use Station.

When to use Station:
- Work spans multiple sessions or days
- Tasks have blockers/dependencies
- You need resumable context after compaction
- You want history in a repo-scoped system

When to use TodoWrite:
- Single-session, short work
- Straight-line checklist
- No dependency graph needed

## Prerequisites

```bash
station --version
```

- `station` CLI installed and in PATH
- You are inside a git repository
- Station initialized once per repo: `station init`

## CLI Reference

Use built-in help as source of truth:

```bash
station --help
station <command> --help
```

Core commands: `init`, `create`, `list`, `show`, `update`, `close`, `reopen`, `ready`

Dependency commands: `dep add`, `dep remove`, `dep list`, `dep tree`

Label commands: `label add`, `label remove`, `label list`, `label list-all`

## Session Protocol

1. `station ready` - pick unblocked work
2. `station show <id>` - load full issue context
3. `station update <id> --status in_progress` - start work
4. Add notes as you work: `station update <id> --notes "..."`
5. `station close <id>` - finish
6. `station list --status open,in_progress` - verify remaining work

## v1 Scope Boundaries

Station v1 intentionally excludes these command families:
- `sync`
- `daemon`
- `import`, `export`, `migrate`
- `admin`, `agents`, `worktrees`, `gates`, `chemistry`

If invoked, Station returns `V1_SCOPE_EXCLUDED`.

## Resources

| Resource | Content |
|----------|---------|
| [BOUNDARIES.md](resources/BOUNDARIES.md) | Station vs TodoWrite decision guidance |
| [CLI_REFERENCE.md](resources/CLI_REFERENCE.md) | Command quick reference and examples |
| [DEPENDENCIES.md](resources/DEPENDENCIES.md) | Dependency semantics and pitfalls |
| [INTEGRATION_PATTERNS.md](resources/INTEGRATION_PATTERNS.md) | Working with TodoWrite and `--json` |
| [ISSUE_CREATION.md](resources/ISSUE_CREATION.md) | What should become a Station issue |
| [PATTERNS.md](resources/PATTERNS.md) | Common workflows and conventions |
| [RESUMABILITY.md](resources/RESUMABILITY.md) | Notes that survive compaction |
| [TROUBLESHOOTING.md](resources/TROUBLESHOOTING.md) | Common failures and fixes |
| [WORKFLOWS.md](resources/WORKFLOWS.md) | End-to-end workflow examples |
| [AGENTS.md](resources/AGENTS.md) | Why agent-specific commands are excluded in v1 |
| [WORKTREES.md](resources/WORKTREES.md) | Worktree guidance without v1 support |

## Full Documentation

- Repo docs: `README.md`, `docs/v1-operators.md`, `docs/parity-matrix.md`
