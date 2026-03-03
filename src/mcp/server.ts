import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initializeStation, getStationInfo } from '../services/system.js';

type StationMcpServerOptions = {
  name?: string;
  version?: string;
};

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
      const payload = await initializeStation();
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload
      };
    }
  );

  server.registerTool(
    'info',
    {
      description: 'Show current station configuration and backend support'
    },
    async () => {
      const payload = await getStationInfo();
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload
      };
    }
  );

  return server;
}

export async function startStationMcpServer(options: StationMcpServerOptions = {}): Promise<void> {
  const server = createStationMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
