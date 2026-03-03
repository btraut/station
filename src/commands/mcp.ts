import { createRequire } from 'node:module';
import { Command } from 'commander';
import { startStationMcpServer } from '../mcp/server.js';
import { wantsJson } from '../core/runtime.js';
import { checkboxPrompt, requireTty } from '../tui.js';
import { installMcp } from '../installer/mcp-install.js';
import { getMcpStatusRows } from '../installer/mcp-status.js';
import { success } from '../core/output.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

export function registerMcpCommand(program: Command): void {
  const startServer = async (options: { name: string; version: string }) => {
    await startStationMcpServer({
      name: options.name,
      version: options.version
    });
  };

  const mcp = program
    .command('mcp')
    .description('MCP server and helpers')
    .option('--json', 'Output machine-readable JSON', false)
    .option('--name <name>', 'MCP server name', 'station')
    .option('--version <version>', 'MCP server version', packageJson.version)
    .action(startServer);

  mcp
    .command('install')
    .description('Install Station as an MCP server in supported clients')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      if (wantsJson()) {
        throw new Error('mcp install is interactive; omit --json.');
      }

      requireTty();

      const selected = await checkboxPrompt<'codex' | 'claude' | 'cursor'>({
        message: 'Install MCP into clients:',
        choices: [
          { value: 'codex', label: 'Codex', checked: true },
          { value: 'claude', label: 'Claude', checked: true },
          { value: 'cursor', label: 'Cursor', checked: true }
        ]
      });

      if (selected.length === 0) {
        process.stdout.write('No changes (nothing selected).\n');
        return;
      }

      let hadError = false;
      const installed: string[] = [];
      const failed: string[] = [];

      for (const harness of selected) {
        const result = await installMcp(harness);
        if (result.ok) {
          installed.push(`- ${harness}`);
          continue;
        }

        hadError = true;
        failed.push(`- ${harness}: ${result.error.message}`);
      }

      if (hadError) {
        process.exitCode = 1;
      }

      if (installed.length > 0) {
        process.stdout.write('MCP installed:\n');
        for (const row of installed) {
          process.stdout.write(`${row}\n`);
        }
      }

      if (failed.length > 0) {
        process.stdout.write('MCP failed:\n');
        for (const row of failed) {
          process.stdout.write(`${row}\n`);
        }
      }
    });

  mcp
    .command('status')
    .description('Show Station MCP install status across supported clients')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const rows = await getMcpStatusRows();

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ rows }), null, 2)}\n`);
        return;
      }

      for (const row of rows) {
        const suffix = row.details ? ` (${row.details})` : '';
        process.stdout.write(`${row.harness}: ${row.status}${suffix}\n`);
      }

      if (rows.some((row) => row.status === 'error')) {
        process.exitCode = 1;
      }
    });
}
