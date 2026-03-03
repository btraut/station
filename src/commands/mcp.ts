import { createRequire } from 'node:module';
import { Command } from 'commander';
import { startStationMcpServer } from '../mcp/server.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

export function registerMcpCommand(program: Command): void {
  program
    .command('mcp')
    .description('Run Station MCP server over stdio')
    .option('--name <name>', 'MCP server name', 'station')
    .option('--version <version>', 'MCP server version', packageJson.version)
    .action(async (options: { name: string; version: string }) => {
      await startStationMcpServer({
        name: options.name,
        version: options.version
      });
    });
}
