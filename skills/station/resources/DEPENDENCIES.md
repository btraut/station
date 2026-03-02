# Dependency Semantics

## Core rule

`station dep add <issueId> <dependsOnId>` means `<issueId>` cannot finish before `<dependsOnId>`.

If setup must finish before implementation:

```bash
station dep add implementation setup --type blocks
```

Not the other way around.

## Dependency types

- `blocks`: hard sequencing and affects `ready`
- `related`: informational relationship
- `discovered_from`: provenance/traceability
- `child`: hierarchical decomposition

## Ready queue behavior

Only unresolved `blocks` edges suppress work from `station ready`.

`related`, `child`, and `discovered_from` are organization/context edges, not hard blockers.

## Cycle handling

Station rejects dependency cycles with `DEPENDENCY_CYCLE`.

Fix by removing/reversing at least one edge:

```bash
station dep list <id>
station dep remove <a> <b> --type blocks
```

## Practical pattern

- Use `blocks` sparingly and intentionally
- Prefer `related` for loose coupling
- Use `child` for parent/subtask shape
- Keep graphs readable or your team will stop trusting `ready`
