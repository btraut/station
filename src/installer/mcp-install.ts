import { spawn } from 'node:child_process'
import { installCursorMcp } from './cursor-mcp.js'

export type McpHarnessId = 'codex' | 'claude' | 'cursor'

export type McpInstallResult =
  | { ok: true; details?: { cursorSettingsPath?: string } }
  | { ok: false; error: { code: string; message: string } }

async function runQuiet(cmd: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      const suffix = stderr.trim().length > 0 ? `: ${stderr.trim()}` : ''
      reject(new Error(`${cmd} exited with ${code ?? 'unknown'}${suffix}`))
    })
  })
}

async function tryRun(cmd: string, args: string[]): Promise<void> {
  try {
    await runQuiet(cmd, args)
  } catch {
    // best-effort removal path
  }
}

export async function installMcp(harness: McpHarnessId): Promise<McpInstallResult> {
  try {
    if (harness === 'codex') {
      await tryRun('codex', ['mcp', 'remove', 'station'])
      await runQuiet('codex', ['mcp', 'add', 'station', '--', 'station', 'mcp'])
      return { ok: true }
    }

    if (harness === 'claude') {
      await tryRun('claude', ['mcp', 'remove', '--scope', 'local', 'station'])
      await tryRun('claude', ['mcp', 'remove', '--scope', 'project', 'station'])
      await tryRun('claude', ['mcp', 'remove', '--scope', 'user', 'station'])
      await runQuiet('claude', [
        'mcp',
        'add',
        '--scope',
        'user',
        '--transport',
        'stdio',
        'station',
        '--',
        'station',
        'mcp'
      ])
      return { ok: true }
    }

    const cursor = await installCursorMcp()
    return { ok: true, details: { cursorSettingsPath: cursor.settingsPath } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.'
    return {
      ok: false,
      error: {
        code: 'MCP_INSTALL_FAILED',
        message
      }
    }
  }
}
