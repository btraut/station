# Station v1 Operator Notes

## Working model

- Station is single-user and repo-scoped.
- `<git-common-dir>/station/station.db` is the source of truth.
- `station init` is idempotent; run it safely in existing repos.

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
- `BACKEND_NOT_IMPLEMENTED`: switch `<git-common-dir>/station/config.json` backend to `sqlite`.
- `STATION_DB_BUSY`: another process holds a write lock; retry shortly.
- `STATION_DB_CONFLICT`: write collided on a uniqueness constraint (for example duplicate explicit issue id).
