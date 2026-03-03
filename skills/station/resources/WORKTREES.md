# Worktrees in Station v1

Station v1 has no worktree command family.

If you use git worktrees manually:
- Run `station` from any worktree; state is shared via `<git-common-dir>/station/`
- Keep issue ids stable across branches
- Use labels/notes to track branch context when needed

If someone tries `station worktree ...`, expect `V1_SCOPE_EXCLUDED`.
