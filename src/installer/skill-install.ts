import fs from 'node:fs/promises'
import path from 'node:path'
import { writeSkillManifest } from './skill-manifest.js'

export type SkillInstallResult = {
  ok: true
  destDir: string
}

export async function installStationSkill(options: {
  srcSkillDir: string
  destSkillsDir: string
  version: string
}): Promise<SkillInstallResult> {
  const destDir = path.join(options.destSkillsDir, 'station')

  await fs.mkdir(options.destSkillsDir, { recursive: true })
  await fs.rm(destDir, { recursive: true, force: true })
  await fs.cp(options.srcSkillDir, destDir, { recursive: true })
  await writeSkillManifest(destDir, options.version)

  return { ok: true, destDir }
}
