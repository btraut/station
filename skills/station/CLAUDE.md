# Station Skill Maintenance Guide

## Architecture Decisions

ADRs in `adr/` capture core maintenance decisions.

| ADR | Decision |
|-----|----------|
| [ADR-0001](adr/0001-station-help-as-source-of-truth.md) | Use `station --help` and subcommand help as CLI source of truth |

## Key Principle: DRY via Station Help

Do not duplicate full CLI syntax in every resource.

Use:
- `station --help`
- `station <command> --help`

Resources should focus on decision-making, patterns, and pitfalls.

## Keeping the Skill Updated

When Station releases:

1. Run `station --help` and inspect command surface changes
2. Update `SKILL.md` frontmatter version
3. Update parity and troubleshooting guidance if new families are added
4. Keep resources concise and conceptual (not a full manual dump)

## Resource Update Checklist

- [ ] Validate command names/flags against current CLI help
- [ ] Remove or fix stale examples
- [ ] Confirm v1 exclusions are still accurate
- [ ] Update README compatibility table

## File Roles

| File | Purpose |
|------|---------|
| SKILL.md | Entry point and activation guidance |
| README.md | Human-facing install + structure |
| CLAUDE.md | Maintainer workflow |
| adr/*.md | Why key decisions exist |
| resources/*.md | Deep-dive patterns and references |
