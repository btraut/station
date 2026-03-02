# Testing Strategy (Station v1)

Station uses a strict test pyramid. Fast tests guard contracts first; slower tests prove end-to-end behavior.

## Layer Ownership

| Layer | Owns | Does not own | Location |
| --- | --- | --- | --- |
| Unit | Pure logic contracts (parsers, errors, output envelopes, runtime flag checks) | SQLite I/O, process spawning | `tests/unit/**/*.test.ts` |
| Repository integration | SQLite repository behavior (ordering, filters, state transitions, dependency semantics, migrations) | CLI argument parsing, command output formatting | `tests/integration/repo/**/*.test.ts` |
| CLI e2e | Exit codes, JSON envelope/error payloads, critical human output lines from real CLI commands | Internal repository implementation details | `tests/e2e/cli/**/*.test.ts` |
| Release smoke | Built artifact execution and packed package shape/bin wiring | Feature-level behavior matrix | `tests/smoke/**/*.test.ts` |

## Quality Targets

- New coverage split target:
  - Unit: 60-70% of total test count.
  - Repository integration: 20-30%.
  - CLI e2e: 8-12%.
  - Release smoke: <=5%.
- Every parser validation failure must assert `StationError.code` and relevant `details`.
- Every CLI error contract test must assert both non-zero exit code and JSON error envelope shape.
- Repository behavior tests must use deterministic ordering assertions and fixed timestamps where possible.

## Runtime Budgets

- Local defaults (full run): <=45s on Node 20, laptop baseline.
- CI lane budgets:
  - Unit lane: <=10s.
  - Repository integration lane: <=20s.
  - CLI e2e lane: <=25s.
  - Smoke lane: <=15s.
- CI should fail if any lane exceeds budget by more than 20%.

## Conventions

- Put new tests in the layer folder above; do not add more root-level `tests/*.test.ts` files.
- Keep shared fixtures/helpers in `tests/helpers/` and avoid cross-layer fixture coupling.
- Prefer table-driven test cases for parser and validation logic.
- Any new CLI command must include:
  - unit tests for pure parsing/validation helpers
  - at least one CLI e2e contract test (human + `--json` where applicable)
