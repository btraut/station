import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Command } from 'commander'
import { success } from '../core/output.js'
import { wantsJson } from '../core/runtime.js'
import { checkboxPrompt, requireTty } from '../tui.js'
import {
  getDefaultHarnessTargets,
  type HarnessId
} from '../installer/harness-targets.js'
import {
  readCliPackageVersion,
  resolveSkillSourceDir
} from '../installer/package-info.js'
import { installStationSkill } from '../installer/skill-install.js'
import { readSkillManifest } from '../installer/skill-manifest.js'

type SkillStatusRow = {
  harness: HarnessId
  skillsDir: string
  installed: boolean
  installedVersion: string | null
  expectedVersion: string
  upToDate: boolean
}

function getHarnessMarkerDir(homeDir: string, harness: HarnessId): string {
  switch (harness) {
    case 'codex':
      return path.join(homeDir, '.agents')
    default:
      return path.join(homeDir, `.${harness}`)
  }
}

export function registerSkillCommands(program: Command): void {
  const skill = program.command('skill').description('Skill commands')

  skill
    .command('install')
    .description('Install the Station skill into one or more clients')
    .option(
      '--client <id...>',
      'Client ids to install into (codex, claude, cursor, factory, opencode, gemini, github, ampcode)'
    )
    .option('--harness <id...>', 'Alias for --client')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async (options: { client?: string[]; harness?: string[] }) => {
      if (wantsJson()) {
        throw new Error('skill install is interactive; omit --json.')
      }

      const version = await readCliPackageVersion()
      const srcSkillDir = await resolveSkillSourceDir()
      const targets = getDefaultHarnessTargets()
      const byId = new Map(targets.map((target) => [target.id, target]))

      let selected: HarnessId[]
      const requested = options.client?.length ? options.client : options.harness
      if (requested && requested.length > 0) {
        selected = requested.map((id) => {
          if (!byId.has(id as HarnessId)) {
            throw new Error(`Unknown client: ${id}`)
          }

          return id as HarnessId
        })
      } else {
        requireTty()
        const homeDir = os.homedir()
        const checked = new Set<HarnessId>()
        for (const target of targets) {
          try {
            await fs.stat(getHarnessMarkerDir(homeDir, target.id))
            checked.add(target.id)
          } catch {
            // no-op
          }
        }

        if (checked.size === 0) {
          checked.add('codex')
        }

        selected = await checkboxPrompt<HarnessId>({
          message: 'Install Station skill into clients:',
          choices: targets.map((target) => ({
            value: target.id,
            label: `${target.label} (${target.skillsDir})`,
            checked: checked.has(target.id)
          }))
        })
      }

      if (selected.length === 0) {
        process.stdout.write('No changes (nothing selected).\n')
        return
      }

      const rows: string[] = []
      for (const client of selected) {
        const target = byId.get(client)
        if (!target) {
          continue
        }

        const installed = await installStationSkill({
          srcSkillDir,
          destSkillsDir: target.skillsDir,
          version
        })
        rows.push(`- ${client}: ${installed.destDir}`)
      }

      process.stdout.write('Station skill installed:\n')
      for (const row of rows) {
        process.stdout.write(`${row}\n`)
      }
    })

  skill
    .command('status')
    .description('Show Station skill install status across clients')
    .option('--json', 'Output machine-readable JSON', false)
    .action(async () => {
      const version = await readCliPackageVersion()
      const targets = getDefaultHarnessTargets()
      const rows: SkillStatusRow[] = []

      for (const target of targets) {
        const skillDir = path.join(target.skillsDir, 'station')
        let installed = false
        try {
          await fs.stat(skillDir)
          installed = true
        } catch {
          installed = false
        }

        const manifest = installed ? await readSkillManifest(skillDir) : null
        const installedVersion = manifest?.version ?? null
        const upToDate = installedVersion === version

        rows.push({
          harness: target.id,
          skillsDir: target.skillsDir,
          installed,
          installedVersion,
          expectedVersion: version,
          upToDate
        })
      }

      if (wantsJson()) {
        process.stdout.write(`${JSON.stringify(success({ rows }), null, 2)}\n`)
        return
      }

      for (const row of rows) {
        const status = row.installed ? (row.upToDate ? 'installed' : 'outdated') : 'missing'
        const versionText = row.installedVersion ? ` (version ${row.installedVersion})` : ''
        process.stdout.write(`${row.harness}: ${status}${versionText}\n`)
      }
    })
}
