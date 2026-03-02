# Troubleshooting

## `NOT_A_GIT_REPO`

Run Station inside a git repository.

## `ISSUE_NOT_FOUND`

Verify the id exists:

```bash
station list --json
```

## `DEPENDENCY_CYCLE`

A new edge would create a cycle. Remove or reverse one edge.

## `BACKEND_NOT_IMPLEMENTED`

Use `sqlite` in `.station/config.json`. `linear` and `asana` are stubs in v1.

## `V1_SCOPE_EXCLUDED`

You called a deferred family (`sync`, `agents`, `worktrees`, etc.). Use supported v1 commands only.

## `Invalid status` or `Invalid dependency type`

Check allowed values:
- status: `open|in_progress|closed`
- dependency type: `blocks|related|discovered_from|child`
