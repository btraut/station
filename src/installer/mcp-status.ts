import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { resolveCursorUserSettingsPath } from './cursor-mcp.js'

type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export type McpStatusHarnessId = 'codex' | 'claude' | 'cursor'

export type McpStatusRow = {
  harness: McpStatusHarnessId
  installed: boolean
  status: 'installed' | 'missing' | 'unavailable' | 'error'
  details?: string
}

type CommandCapture = {
  ok: boolean
  stdout: string
  stderr: string
  error?: Error
}

async function runCapture(cmd: string, args: string[]): Promise<CommandCapture> {
  return await new Promise<CommandCapture>((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk)
    })

    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', (error) => {
      resolve({
        ok: false,
        stdout,
        stderr,
        error: error as Error
      })
    })

    child.on('exit', (code) => {
      resolve({
        ok: code === 0,
        stdout,
        stderr
      })
    })
  })
}

export function hasStationInCodexList(stdout: string): boolean {
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      continue
    }

    const firstToken = trimmed.split(/\s+/)[0]?.toLowerCase()
    if (firstToken === 'name') {
      continue
    }

    if (firstToken === 'station') {
      return true
    }
  }

  return false
}

export function hasStationInClaudeList(stdout: string): boolean {
  return stdout
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .some((line) => line.startsWith('station:'))
}

async function getCodexMcpStatus(): Promise<McpStatusRow> {
  const result = await runCapture('codex', ['mcp', 'list'])

  if (!result.ok && result.error) {
    const code =
      typeof result.error === 'object' &&
      result.error !== null &&
      'code' in result.error
        ? String((result.error as { code?: unknown }).code)
        : ''

    if (code === 'ENOENT') {
      return {
        harness: 'codex',
        installed: false,
        status: 'unavailable',
        details: 'codex CLI not found'
      }
    }
  }

  if (!result.ok) {
    const details = result.stderr.trim() || result.stdout.trim() || 'codex mcp list failed'
    return {
      harness: 'codex',
      installed: false,
      status: 'error',
      details
    }
  }

  if (hasStationInCodexList(result.stdout)) {
    return {
      harness: 'codex',
      installed: true,
      status: 'installed'
    }
  }

  return {
    harness: 'codex',
    installed: false,
    status: 'missing'
  }
}

async function getClaudeMcpStatus(): Promise<McpStatusRow> {
  const result = await runCapture('claude', ['mcp', 'list'])

  if (!result.ok && result.error) {
    const code =
      typeof result.error === 'object' &&
      result.error !== null &&
      'code' in result.error
        ? String((result.error as { code?: unknown }).code)
        : ''

    if (code === 'ENOENT') {
      return {
        harness: 'claude',
        installed: false,
        status: 'unavailable',
        details: 'claude CLI not found'
      }
    }
  }

  if (!result.ok) {
    const details = result.stderr.trim() || result.stdout.trim() || 'claude mcp list failed'
    return {
      harness: 'claude',
      installed: false,
      status: 'error',
      details
    }
  }

  if (hasStationInClaudeList(result.stdout)) {
    return {
      harness: 'claude',
      installed: true,
      status: 'installed'
    }
  }

  return {
    harness: 'claude',
    installed: false,
    status: 'missing'
  }
}

async function getCursorMcpStatus(): Promise<McpStatusRow> {
  try {
    const settingsPath = resolveCursorUserSettingsPath()
    const raw = await fs.readFile(settingsPath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!isObject(parsed)) {
      return {
        harness: 'cursor',
        installed: false,
        status: 'error',
        details: 'Cursor settings.json is not a JSON object.'
      }
    }

    const mcp = isObject(parsed.mcp) ? parsed.mcp : {}
    const servers = isObject(mcp.servers) ? mcp.servers : {}
    const station = servers.station
    const installed = isObject(station)

    return {
      harness: 'cursor',
      installed,
      status: installed ? 'installed' : 'missing'
    }
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === 'ENOENT'
    ) {
      return {
        harness: 'cursor',
        installed: false,
        status: 'missing'
      }
    }

    const message = error instanceof Error ? error.message : 'Failed reading Cursor settings'
    return {
      harness: 'cursor',
      installed: false,
      status: 'error',
      details: message
    }
  }
}

export async function getMcpStatusRows(): Promise<McpStatusRow[]> {
  return [await getCodexMcpStatus(), await getClaudeMcpStatus(), await getCursorMcpStatus()]
}
