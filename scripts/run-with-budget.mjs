#!/usr/bin/env node
import { spawn } from 'node:child_process';

const [budgetArg, lane, ...command] = process.argv.slice(2);

if (!budgetArg || !lane || command.length === 0) {
  console.error('Usage: node scripts/run-with-budget.mjs <budget-seconds> <lane> <command...>');
  process.exit(2);
}

const budgetSeconds = Number(budgetArg);
if (!Number.isFinite(budgetSeconds) || budgetSeconds <= 0) {
  console.error(`Invalid budget: ${budgetArg}`);
  process.exit(2);
}

const allowedSeconds = budgetSeconds * 1.2;
const startedAt = Date.now();

const child = spawn(command[0], command.slice(1), {
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  const elapsedSeconds = (Date.now() - startedAt) / 1000;

  if (signal) {
    console.error(`[budget:${lane}] command terminated by signal ${signal}`);
    process.exit(1);
  }

  if ((code ?? 1) !== 0) {
    process.exit(code ?? 1);
  }

  if (elapsedSeconds > allowedSeconds) {
    console.error(
      `[budget:${lane}] exceeded budget: ${elapsedSeconds.toFixed(2)}s > ${allowedSeconds.toFixed(2)}s `
      + `(target ${budgetSeconds.toFixed(2)}s with 20% tolerance)`
    );
    process.exit(1);
  }

  console.log(
    `[budget:${lane}] ${elapsedSeconds.toFixed(2)}s within ${allowedSeconds.toFixed(2)}s `
    + `(target ${budgetSeconds.toFixed(2)}s)`
  );
});
