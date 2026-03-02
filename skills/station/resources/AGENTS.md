# Agents in Station v1

Station v1 does not implement an `agents` command family.

What to do instead:
- Track agent-owned work with labels, for example `agent:frontend`, `agent:backend`
- Keep ownership notes in `station update <id> --notes "..."`
- Use dependency edges to model handoffs between issues

If someone runs `station agents ...`, expect `V1_SCOPE_EXCLUDED`.
