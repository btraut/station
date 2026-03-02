# Station CLI Quick Reference

Use this as a quick index. Validate exact flags with `station <command> --help`.

## Bootstrap

```bash
station init
station info
station --version
```

## Issues

```bash
station create --title "Ship v1"
station list
station show station-1
station update station-1 --status in_progress --notes "Started implementation"
station close station-1
station reopen station-1
```

Common fields:
- `status`: `open|in_progress|closed`
- `priority`: `0..4` (lower is higher priority)
- `type`: free text (`task` is default)

## Dependencies

```bash
station dep add station-2 station-1 --type blocks
station dep list station-2
station dep tree station-2 --type blocks
station dep remove station-2 station-1 --type blocks
```

Dependency direction:
- `station dep add A B` means `A depends on B`

## Labels

```bash
station label add station-1 backend
station label list station-1
station label list-all
station label remove station-1 backend
```

## Ready Queue

```bash
station ready
```

`ready` returns open/in-progress issues not blocked by unresolved `blocks` dependencies.

## JSON output

Every command supports `--json`.

```bash
station list --status open,in_progress --json
```
