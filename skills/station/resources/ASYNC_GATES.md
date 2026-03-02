# Async Gates in Station v1

Station v1 has no first-class gates API.

Workable pattern:
1. Create a gate issue (`type: task`, title prefixed with `Gate:`)
2. Add `blocks` dependencies from gated tasks to the gate issue
3. Close the gate issue when human approval arrives
4. `station ready` will then surface newly unblocked work

This is a simple substitute for explicit async gate commands.
