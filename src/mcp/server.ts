import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import { isStationError } from '../core/errors.js';
import { failure, success, type FailureEnvelope, type SuccessEnvelope } from '../core/output.js';
import { closeIssue, createIssue, listIssues, reopenIssue, showIssue, updateIssue } from '../services/issues.js';
import {
  addDependency,
  listDependencies,
  listDependencyTree,
  listReadyIssues,
  removeDependency
} from '../services/dependencies.js';
import { addLabel, listAllLabels, listLabels, removeLabel } from '../services/labels.js';
import { getStationInfo, initializeStation } from '../services/system.js';

type StationMcpServerOptions = {
  name?: string;
  version?: string;
};

type StationEnvelope<T> = SuccessEnvelope<T> | FailureEnvelope;

async function toEnvelope<T>(work: () => Promise<T>): Promise<StationEnvelope<T>> {
  try {
    return success(await work());
  } catch (error: unknown) {
    if (isStationError(error)) {
      return failure(error.code, error.message, error.details);
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return failure('UNHANDLED_ERROR', message);
  }
}

function toToolResult<T>(envelope: StationEnvelope<T>) {
  return {
    isError: !envelope.ok,
    content: [{ type: 'text' as const, text: JSON.stringify(envelope, null, 2) }],
    structuredContent: envelope
  };
}

export function createStationMcpServer(options: StationMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name ?? 'station',
    version: options.version ?? '0.0.0'
  });

  server.registerTool(
    'init',
    {
      description: 'Initialize station state in the current repository'
    },
    async () => {
      return toToolResult(await toEnvelope(async () => initializeStation()));
    }
  );

  server.registerTool(
    'info',
    {
      description: 'Show current station configuration and backend support'
    },
    async () => {
      return toToolResult(await toEnvelope(async () => getStationInfo()));
    }
  );

  server.registerTool(
    'create',
    {
      description: 'Create a new issue',
      inputSchema: {
        title: z.string(),
        id: z.string().optional(),
        type: z.string().optional(),
        priority: z.string().optional(),
        description: z.string().optional(),
        design: z.string().optional(),
        notes: z.string().optional(),
        acceptance: z.string().optional(),
        status: z.string().optional()
      }
    },
    async (args) => {
      return toToolResult(
        await toEnvelope(async () => ({
          issue: await createIssue(args)
        }))
      );
    }
  );

  server.registerTool(
    'list',
    {
      description: 'List issues',
      inputSchema: {
        status: z.string().optional(),
        priority: z.string().optional(),
        type: z.string().optional(),
        ids: z.string().optional(),
        labelsAny: z.string().optional(),
        labelsAll: z.string().optional(),
        query: z.string().optional()
      }
    },
    async (args) => {
      return toToolResult(
        await toEnvelope(async () => ({
          issues: await listIssues(args)
        }))
      );
    }
  );

  server.registerTool(
    'show',
    {
      description: 'Show one issue',
      inputSchema: {
        id: z.string()
      }
    },
    async ({ id }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          issue: await showIssue(id)
        }))
      );
    }
  );

  server.registerTool(
    'update',
    {
      description: 'Update issue fields',
      inputSchema: {
        id: z.string(),
        title: z.string().optional(),
        type: z.string().optional(),
        priority: z.string().optional(),
        status: z.string().optional(),
        description: z.string().optional(),
        design: z.string().optional(),
        notes: z.string().optional(),
        acceptance: z.string().optional()
      }
    },
    async ({ id, ...patch }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          issue: await updateIssue(id, patch)
        }))
      );
    }
  );

  server.registerTool(
    'close',
    {
      description: 'Close an issue',
      inputSchema: {
        id: z.string()
      }
    },
    async ({ id }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          issue: await closeIssue(id)
        }))
      );
    }
  );

  server.registerTool(
    'reopen',
    {
      description: 'Reopen an issue',
      inputSchema: {
        id: z.string()
      }
    },
    async ({ id }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          issue: await reopenIssue(id)
        }))
      );
    }
  );

  server.registerTool(
    'open',
    {
      description: 'Alias of reopen',
      inputSchema: {
        id: z.string()
      }
    },
    async ({ id }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          issue: await reopenIssue(id)
        }))
      );
    }
  );

  server.registerTool(
    'dep.add',
    {
      description: 'Add dependency edge',
      inputSchema: {
        issueId: z.string(),
        dependsOnId: z.string(),
        type: z.string().optional()
      }
    },
    async ({ issueId, dependsOnId, type }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          dependency: await addDependency(issueId, dependsOnId, type)
        }))
      );
    }
  );

  server.registerTool(
    'dep.remove',
    {
      description: 'Remove dependency edge',
      inputSchema: {
        issueId: z.string(),
        dependsOnId: z.string(),
        type: z.string().optional()
      }
    },
    async ({ issueId, dependsOnId, type }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          removed: true,
          dependency: await removeDependency(issueId, dependsOnId, type)
        }))
      );
    }
  );

  server.registerTool(
    'dep.list',
    {
      description: 'List dependency edges',
      inputSchema: {
        issueId: z.string().optional(),
        type: z.string().optional()
      }
    },
    async ({ issueId, type }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          dependencies: await listDependencies(issueId, type)
        }))
      );
    }
  );

  server.registerTool(
    'dep.tree',
    {
      description: 'Show recursive dependency tree for an issue',
      inputSchema: {
        issueId: z.string(),
        type: z.string().optional()
      }
    },
    async ({ issueId, type }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          dependencies: await listDependencyTree(issueId, type)
        }))
      );
    }
  );

  server.registerTool(
    'ready',
    {
      description: 'List actionable unblocked issues'
    },
    async () => {
      return toToolResult(
        await toEnvelope(async () => ({
          issues: await listReadyIssues()
        }))
      );
    }
  );

  server.registerTool(
    'label.add',
    {
      description: 'Add label to issue',
      inputSchema: {
        issueId: z.string(),
        name: z.string()
      }
    },
    async ({ issueId, name }) => {
      return toToolResult(
        await toEnvelope(async () => {
          await addLabel(issueId, name);
          return { issueId, label: name, added: true };
        })
      );
    }
  );

  server.registerTool(
    'label.remove',
    {
      description: 'Remove label from issue',
      inputSchema: {
        issueId: z.string(),
        name: z.string()
      }
    },
    async ({ issueId, name }) => {
      return toToolResult(
        await toEnvelope(async () => {
          await removeLabel(issueId, name);
          return { issueId, label: name, removed: true };
        })
      );
    }
  );

  server.registerTool(
    'label.list',
    {
      description: 'List issue labels',
      inputSchema: {
        issueId: z.string()
      }
    },
    async ({ issueId }) => {
      return toToolResult(
        await toEnvelope(async () => ({
          issueId,
          labels: await listLabels(issueId)
        }))
      );
    }
  );

  server.registerTool(
    'label.list-all',
    {
      description: 'List all labels'
    },
    async () => {
      return toToolResult(
        await toEnvelope(async () => ({
          labels: await listAllLabels()
        }))
      );
    }
  );

  return server;
}

export async function startStationMcpServer(options: StationMcpServerOptions = {}): Promise<void> {
  const server = createStationMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
