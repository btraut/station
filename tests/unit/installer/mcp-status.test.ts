import { describe, expect, it } from 'vitest'
import {
  hasStationInClaudeList,
  hasStationInCodexList
} from '../../../src/installer/mcp-status.js'

describe('mcp status parsing', () => {
  it('detects station in codex mcp list output', () => {
    const output = [
      'Name            Command         Args  Env  Cwd  Status   Auth       ',
      'browser-bridge  browser-bridge  mcp   -    -    enabled  Unsupported',
      'station         station         mcp   -    -    enabled  Unsupported'
    ].join('\n')

    expect(hasStationInCodexList(output)).toBe(true)
    expect(hasStationInCodexList('Name Command\nbrowser-bridge browser-bridge')).toBe(false)
  })

  it('detects station in claude mcp list output', () => {
    const output = [
      'Checking MCP server health...',
      '',
      'station: station mcp - ✓ Connected'
    ].join('\n')

    expect(hasStationInClaudeList(output)).toBe(true)
    expect(hasStationInClaudeList('browser-bridge: browser-bridge mcp - ✓ Connected')).toBe(false)
  })
})
