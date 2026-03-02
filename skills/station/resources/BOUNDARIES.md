# Station vs TodoWrite Boundaries

## Use Station when durability matters

Choose Station if any of this is true:
- Work lasts longer than this chat/session
- You need dependency tracking
- You need a durable issue graph in the repo
- You need to resume after compaction without guesswork

## Use TodoWrite when speed matters

Choose TodoWrite if:
- Work is short and linear
- No blockers/dependency graph is needed
- The list dies with the current session

## Hybrid pattern (best default)

- Track durable outcomes in Station
- Keep short execution steps in TodoWrite

Example:
- Station issue: `station-42` "Implement auth callbacks"
- TodoWrite: 5-step local execution checklist for this session

## Anti-patterns

- Putting every tiny shell step into Station
- Tracking week-long work only in TodoWrite
- Ignoring dependencies and then wondering why `ready` output is messy
