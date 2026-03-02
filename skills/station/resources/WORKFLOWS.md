# Workflow Playbooks

## Start of session

1. `station ready`
2. Pick one issue
3. `station show <id>`
4. `station update <id> --status in_progress`

## During work

1. Capture decisions in notes
2. Add dependencies as discovered
3. Split oversized work into `child` issues

## End of session

1. Update notes with exact next step
2. Close completed issues
3. Re-run `station ready`
4. Leave queue in a truthful state

## Multi-issue feature pattern

1. Create parent feature issue
2. Create child implementation issues
3. Add strict blockers only when sequencing is real
4. Drive work from `ready` until parent can close
