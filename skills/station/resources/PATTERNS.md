# Common Station Patterns

## Weekly planning

1. Create/refresh issues
2. Add blocker edges with `dep add --type blocks`
3. Set ownership labels
4. Work from `station ready`

## Bug triage

1. `station create --type bug --title "..." --priority 0`
2. Link upstream cause with `--type discovered_from`
3. Add acceptance notes for reproduction + fix validation

## Refactor with guardrails

1. Parent issue for strategy
2. `child` issues for bounded slices
3. `blocks` only where strict ordering matters

## Finishing discipline

Before closing:
- Notes explain what changed
- Acceptance criteria are satisfied
- Downstream blockers are unblocked
