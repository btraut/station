# Integration Patterns

## Station + TodoWrite

Strong default:
- Station stores durable task graph and notes
- TodoWrite stores session execution checklist

## Station + shell automation

Use `--json` and parse outputs in scripts:

```bash
station ready --json
station show station-12 --json
```

## Session handoff pattern

At pause points:
1. `station update <id> --notes "what changed, what is next, blockers"`
2. Ensure status is accurate (`open` or `in_progress`)
3. Re-check queue with `station ready`

## Labels for agent ownership

Since v1 lacks agent APIs, labels are the easiest ownership channel:

```bash
station label add station-9 agent:frontend
station label add station-9 area:auth
```
