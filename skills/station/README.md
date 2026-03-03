# Station Skill

A Codex/agent skill for using Station as persistent issue memory across long-running work.

## What This Skill Does

It teaches agents how to:
- Track multi-session work in Station instead of losing context in chat history
- Model blockers using dependency edges
- Keep progress resumable with durable notes
- Stay inside Station v1 scope boundaries

## Installation

Recommended:

```bash
station skill install
```

Manual copy (advanced):

```bash
# Global
cp -r station ~/.agents/skills/

# Project-local
cp -r station .agents/skills/
```

If your agent host uses a different skills path (for example `$CODEX_HOME/skills`), copy there instead.

## File Structure

```text
station/
├── SKILL.md
├── CLAUDE.md
├── README.md
├── adr/
│   └── 0001-station-help-as-source-of-truth.md
└── resources/
    ├── AGENTS.md
    ├── ASYNC_GATES.md
    ├── BOUNDARIES.md
    ├── CHEMISTRY_PATTERNS.md
    ├── CLI_REFERENCE.md
    ├── DEPENDENCIES.md
    ├── INTEGRATION_PATTERNS.md
    ├── ISSUE_CREATION.md
    ├── MOLECULES.md
    ├── PATTERNS.md
    ├── RESUMABILITY.md
    ├── STATIC_DATA.md
    ├── TROUBLESHOOTING.md
    ├── WORKFLOWS.md
    └── WORKTREES.md
```

## Requirements

- Node 20+
- `station` installed and callable from shell
- Git repository context
- `station init` executed in target repo

## Version Compatibility

| Station version | Support |
|----------------|---------|
| v0.1.x | Full v1 support |
| Future versions | Re-validate command parity |

## Scope Reminder

Station v1 is intentionally single-user and repo-scoped. Command families like `sync`, `agents`, `worktrees`, `gates`, and `chemistry` are excluded.

## License

MIT (same as Station repository)
