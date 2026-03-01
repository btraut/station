#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const bump = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: node scripts/release.mjs <patch|minor|major> [--dry-run]');
  process.exit(1);
}

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function runCapture(cmd, args) {
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function assertCleanTree() {
  const dirty = runCapture('git', ['status', '--porcelain']);
  if (dirty.length > 0) {
    console.error('Working tree must be clean before release.');
    process.exit(1);
  }
}

function prependChangelog(version) {
  const file = 'CHANGELOG.md';
  const existing = readFileSync(file, 'utf8');
  const date = new Date().toISOString().slice(0, 10);
  const header = `## v${version} - ${date}\n\n- Release build\n\n`;
  writeFileSync(file, existing.replace('# Changelog\n\n', `# Changelog\n\n${header}`), 'utf8');
}

assertCleanTree();
run('npm', ['run', 'lint']);
run('npm', ['run', 'typecheck']);
run('npm', ['test']);
run('npm', ['version', bump, '--no-git-tag-version']);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
prependChangelog(version);

if (dryRun) {
  run('npm', ['pack', '--dry-run']);
  console.log(`Dry-run complete for v${version}`);
  process.exit(0);
}

run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md']);
run('git', ['commit', '-m', `release: v${version}`]);
run('git', ['tag', `v${version}`]);
run('npm', ['publish', '--access', 'public']);

console.log(`Published v${version}`);
