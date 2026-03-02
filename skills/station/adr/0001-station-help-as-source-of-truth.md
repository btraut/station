# ADR-0001: Station Help as Source of Truth

## Status

Accepted

## Context

Station evolves, and hand-maintained command docs drift quickly.

## Decision

Use CLI help output as canonical syntax:
- `station --help`
- `station <command> --help`

Skill docs should focus on practical decisions, workflows, and error handling.

## Consequences

- Lower maintenance cost
- Fewer stale command examples
- Easier upgrades when CLI surface changes
