import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { installCursorMcp } from '../../../src/installer/cursor-mcp.js';

const mkdirTemp = async (prefix: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), prefix));

describe('cursor mcp install', () => {
  it('adds mcp.servers.station to settings.json', async () => {
    const root = await mkdirTemp('station-cursor-');
    const settingsPath = path.join(root, 'settings.json');

    await fs.writeFile(
      settingsPath,
      JSON.stringify({ 'editor.fontSize': 12 }, null, 2) + '\n',
      'utf8'
    );

    const result = await installCursorMcp(settingsPath);
    expect(result.settingsPath).toBe(settingsPath);

    const raw = await fs.readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      mcp?: { servers?: Record<string, unknown> };
    };

    expect(parsed.mcp?.servers?.station).toEqual({
      command: 'station',
      args: ['mcp']
    });
  });
});
