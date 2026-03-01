# Release Process

## One flow

Dry run:

```bash
npm run release:dry-run:patch
```

Publish:

```bash
npm run release:patch
```

You can swap `patch` with `minor` or `major`.

## What the release script does

1. Verifies clean git working tree.
2. Runs `lint`, `typecheck`, and `test`.
3. Bumps version in `package.json` + `package-lock.json`.
4. Prepends a new changelog header in `CHANGELOG.md`.
5. Dry-run mode: `npm pack --dry-run` and stop.
6. Publish mode: commit release files, create tag, and `npm publish`.

## Rollback notes

If publish fails after tag/commit:

```bash
git tag -d vX.Y.Z
git reset --hard HEAD~1
```

If publish succeeded but artifact is bad, ship a new patch release immediately. Do not yank history.
