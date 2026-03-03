# Station v1 Operator Notes

## Working model

- Station is single-user and repo-local.
- `.station/station.db` is the source of truth.
- `station init` is idempotent; run it safely in existing repos.
- MCP runtime is daemon-free: `station mcp` runs as a foreground stdio process per client session.

## MCP operations

- Entry command: `station mcp`
- Station does not require or spawn a background daemon in v1.
- MCP tool semantics mirror CLI command semantics, including alias behavior (`open` == `reopen`).
- Nested command families are exposed as dotted tools: `dep.*` and `label.*`.

## Backend behavior

- `sqlite` is the only supported backend in v1.
- `linear` and `asana` exist as adapter stubs and return `BACKEND_NOT_IMPLEMENTED`.

## Scope boundaries

Station v1 intentionally does not implement collaboration/ops families:

- `sync`, `daemon`, `import`, `export`, `migrate`, `admin`, `agents`, `worktrees`, `gates`, `chemistry`

Running one of those returns `V1_SCOPE_EXCLUDED` with structured error details.

## Troubleshooting

- `NOT_A_GIT_REPO`: run Station inside a git repo.
- `ISSUE_NOT_FOUND`: verify issue id via `station list --json`.
- `DEPENDENCY_CYCLE`: remove or reorder dependency edges.
- `BACKEND_NOT_IMPLEMENTED`: switch `.station/config.json` backend to `sqlite`.
- MCP `isError: true`: inspect returned Station envelope for `error.code`, `error.message`, and `error.details`.
