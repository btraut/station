import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

type Envelope = {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string; details?: unknown };
};

const tempDirs: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cliPath = path.join(repoRoot, 'src', 'cli.ts');
const tsxPath = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

type SuccessCase = {
  name: string;
  setup?: string[][];
  cliArgs: string[];
  toolName: string;
  toolArgs?: Record<string, string>;
};

type ErrorCase = {
  name: string;
  setup?: string[][];
  cliArgs: string[];
  toolName: string;
  toolArgs?: Record<string, string>;
};

function createRepo(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

function runCliJson(cwd: string, args: string[]): Envelope {
  const output = execFileSync(tsxPath, [cliPath, ...args, '--json'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  }).toString();
  return JSON.parse(output) as Envelope;
}

function runCliJsonFailure(cwd: string, args: string[]): Envelope {
  let stdout = '';
  try {
    execFileSync(tsxPath, [cliPath, ...args, '--json'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    stdout = (error as { stdout?: Buffer }).stdout?.toString() ?? '';
  }
  return JSON.parse(stdout) as Envelope;
}

async function runMcpTool(
  cwd: string,
  toolName: string,
  toolArgs?: Record<string, string>
): Promise<{ isError: boolean; envelope: Envelope }> {
  const transport = new StdioClientTransport({
    command: tsxPath,
    args: [cliPath, 'mcp'],
    cwd
  });
  const client = new Client({ name: 'station-mcp-parity', version: '0.0.0' });
  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: toolName,
      arguments: toolArgs ?? {}
    });
    const envelope = (result.structuredContent ??
      JSON.parse(
        ((result.content[0] as { type: string; text?: string } | undefined)?.text ?? '{}').trim()
      )) as Envelope;

    return {
      isError: Boolean(result.isError),
      envelope
    };
  } finally {
    await client.close();
  }
}

function normalizeValue(value: unknown): unknown {
  const volatileKeys = new Set(['createdAt', 'updatedAt', 'closedAt', 'repoRoot', 'stationDir', 'dbPath']);

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!volatileKeys.has(key)) {
        result[key] = normalizeValue(entry);
      }
    }
    return result;
  }

  return value;
}

async function runSuccessParityCase(testCase: SuccessCase): Promise<void> {
  const cliRepo = createRepo('station-mcp-cli-');
  const mcpRepo = createRepo('station-mcp-mcp-');

  for (const setupArgs of testCase.setup ?? []) {
    const cliSetup = runCliJson(cliRepo, setupArgs);
    const mcpSetup = runCliJson(mcpRepo, setupArgs);
    expect(cliSetup.ok).toBe(true);
    expect(mcpSetup.ok).toBe(true);
  }

  const cliEnvelope = runCliJson(cliRepo, testCase.cliArgs);
  const mcpResult = await runMcpTool(mcpRepo, testCase.toolName, testCase.toolArgs);

  expect(cliEnvelope.ok).toBe(true);
  expect(mcpResult.isError).toBe(false);
  expect(normalizeValue(mcpResult.envelope)).toEqual(normalizeValue(cliEnvelope));
}

async function runErrorParityCase(testCase: ErrorCase): Promise<void> {
  const cliRepo = createRepo('station-mcp-cli-err-');
  const mcpRepo = createRepo('station-mcp-mcp-err-');

  for (const setupArgs of testCase.setup ?? []) {
    const cliSetup = runCliJson(cliRepo, setupArgs);
    const mcpSetup = runCliJson(mcpRepo, setupArgs);
    expect(cliSetup.ok).toBe(true);
    expect(mcpSetup.ok).toBe(true);
  }

  const cliEnvelope = runCliJsonFailure(cliRepo, testCase.cliArgs);
  const mcpResult = await runMcpTool(mcpRepo, testCase.toolName, testCase.toolArgs);

  expect(cliEnvelope.ok).toBe(false);
  expect(mcpResult.isError).toBe(true);
  expect(normalizeValue(mcpResult.envelope)).toEqual(normalizeValue(cliEnvelope));
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('mcp parity with cli', () => {
  it(
    'matches success envelopes for mirrored command surface',
    async () => {
    const successCases: SuccessCase[] = [
      { name: 'init', cliArgs: ['init'], toolName: 'init' },
      { name: 'info', cliArgs: ['info'], toolName: 'info' },
      { name: 'create', cliArgs: ['create', '--title', 'Ship'], toolName: 'create', toolArgs: { title: 'Ship' } },
      {
        name: 'list',
        setup: [['create', '--title', 'Ship']],
        cliArgs: ['list'],
        toolName: 'list'
      },
      {
        name: 'show',
        setup: [['create', '--title', 'Ship']],
        cliArgs: ['show', 'station-1'],
        toolName: 'show',
        toolArgs: { id: 'station-1' }
      },
      {
        name: 'update',
        setup: [['create', '--title', 'Ship']],
        cliArgs: ['update', 'station-1', '--status', 'in_progress', '--priority', '1'],
        toolName: 'update',
        toolArgs: { id: 'station-1', status: 'in_progress', priority: '1' }
      },
      {
        name: 'close',
        setup: [['create', '--title', 'Ship']],
        cliArgs: ['close', 'station-1'],
        toolName: 'close',
        toolArgs: { id: 'station-1' }
      },
      {
        name: 'reopen',
        setup: [['create', '--title', 'Ship'], ['close', 'station-1']],
        cliArgs: ['reopen', 'station-1'],
        toolName: 'reopen',
        toolArgs: { id: 'station-1' }
      },
      {
        name: 'open alias',
        setup: [['create', '--title', 'Ship'], ['close', 'station-1']],
        cliArgs: ['open', 'station-1'],
        toolName: 'open',
        toolArgs: { id: 'station-1' }
      },
      {
        name: 'dep add',
        setup: [['create', '--title', 'A'], ['create', '--title', 'B']],
        cliArgs: ['dep', 'add', 'station-2', 'station-1'],
        toolName: 'dep.add',
        toolArgs: { issueId: 'station-2', dependsOnId: 'station-1' }
      },
      {
        name: 'dep list',
        setup: [
          ['create', '--title', 'A'],
          ['create', '--title', 'B'],
          ['dep', 'add', 'station-2', 'station-1']
        ],
        cliArgs: ['dep', 'list', 'station-2'],
        toolName: 'dep.list',
        toolArgs: { issueId: 'station-2' }
      },
      {
        name: 'dep tree',
        setup: [
          ['create', '--title', 'A'],
          ['create', '--title', 'B'],
          ['create', '--title', 'C'],
          ['dep', 'add', 'station-2', 'station-1'],
          ['dep', 'add', 'station-3', 'station-2']
        ],
        cliArgs: ['dep', 'tree', 'station-3'],
        toolName: 'dep.tree',
        toolArgs: { issueId: 'station-3' }
      },
      {
        name: 'dep remove',
        setup: [
          ['create', '--title', 'A'],
          ['create', '--title', 'B'],
          ['dep', 'add', 'station-2', 'station-1']
        ],
        cliArgs: ['dep', 'remove', 'station-2', 'station-1'],
        toolName: 'dep.remove',
        toolArgs: { issueId: 'station-2', dependsOnId: 'station-1' }
      },
      {
        name: 'ready',
        setup: [
          ['create', '--title', 'A'],
          ['create', '--title', 'B'],
          ['dep', 'add', 'station-2', 'station-1']
        ],
        cliArgs: ['ready'],
        toolName: 'ready'
      },
      {
        name: 'label add',
        setup: [['create', '--title', 'A']],
        cliArgs: ['label', 'add', 'station-1', 'v1'],
        toolName: 'label.add',
        toolArgs: { issueId: 'station-1', name: 'v1' }
      },
      {
        name: 'label list',
        setup: [['create', '--title', 'A'], ['label', 'add', 'station-1', 'v1']],
        cliArgs: ['label', 'list', 'station-1'],
        toolName: 'label.list',
        toolArgs: { issueId: 'station-1' }
      },
      {
        name: 'label list-all',
        setup: [['create', '--title', 'A'], ['label', 'add', 'station-1', 'v1']],
        cliArgs: ['label', 'list-all'],
        toolName: 'label.list-all'
      },
      {
        name: 'label remove',
        setup: [['create', '--title', 'A'], ['label', 'add', 'station-1', 'v1']],
        cliArgs: ['label', 'remove', 'station-1', 'v1'],
        toolName: 'label.remove',
        toolArgs: { issueId: 'station-1', name: 'v1' }
      }
    ];

      for (const testCase of successCases) {
        await runSuccessParityCase(testCase);
      }
    },
    120000
  );

  it('matches error envelopes for representative failure paths', async () => {
    const errorCases: ErrorCase[] = [
      {
        name: 'update with no fields',
        setup: [['create', '--title', 'A']],
        cliArgs: ['update', 'station-1'],
        toolName: 'update',
        toolArgs: { id: 'station-1' }
      },
      {
        name: 'create invalid status',
        cliArgs: ['create', '--title', 'A', '--status', 'blocked'],
        toolName: 'create',
        toolArgs: { title: 'A', status: 'blocked' }
      },
      {
        name: 'dep add invalid type',
        setup: [['create', '--title', 'A'], ['create', '--title', 'B']],
        cliArgs: ['dep', 'add', 'station-2', 'station-1', '--type', 'invalid'],
        toolName: 'dep.add',
        toolArgs: { issueId: 'station-2', dependsOnId: 'station-1', type: 'invalid' }
      },
      {
        name: 'show missing issue',
        cliArgs: ['show', 'station-999'],
        toolName: 'show',
        toolArgs: { id: 'station-999' }
      }
    ];

    for (const testCase of errorCases) {
      await runErrorParityCase(testCase);
    }
  });
});
