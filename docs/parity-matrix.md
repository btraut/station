# Station v1 CLI Parity Matrix

This matrix maps Beads command intent to Station v1 status.

## In Scope (v1 single-user)

| Command family | Station command(s) | Status | Notes |
| --- | --- | --- | --- |
| bootstrap | `station init`, `station info` | Implemented | Repo-local `.station/` setup and config inspection |
| issue lifecycle | `create`, `list`, `show`, `update`, `close`, `reopen`, `open` | Implemented | `open` is alias for `reopen` |
| dependencies | `dep add/remove/list/tree` | Implemented | Supports `blocks`, `related`, `discovered_from`, `child` |
| ready queue | `ready` | Implemented | Strict blocker semantics on unresolved `blocks` dependencies |
| labels | `label add/remove/list/list-all` | Implemented | Plus list filtering on labels |
| query filters | `list --status/--priority/--type/--ids/--labels-any/--labels-all/--query` | Implemented | Compound filter support |

## Intentionally Excluded (v1 policy)

| Beads family | Station v1 status | Rationale |
| --- | --- | --- |
| `sync` / git-coordination | Excluded | Station v1 is single-user and repo-local only |
| daemon/background ops | Excluded | No daemon or background process model in v1 |
| import/export/migrate | Excluded | Deferred until external backends mature |
| admin/worktrees/agents/gates/chemistry | Excluded | Explicitly out of v1 scope |
| multi-user collaboration commands | Excluded | Station v1 does not model team state |

## Deferred (in-scope-adjacent)

| Command/feature | Status | Rationale |
| --- | --- | --- |
| stale detection commands | Deferred | Needs additional timestamp policy and UX decisions |
| duplicate detection + merge workflow | Deferred | Requires canonical merge semantics and migration rules |

