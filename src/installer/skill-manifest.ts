import fs from 'node:fs/promises'
import path from 'node:path'

export type SkillManifest = {
  name: 'station'
  version: string
}

export const SKILL_MANIFEST_FILENAME = 'skill.json'

export async function readSkillManifest(skillDir: string): Promise<SkillManifest | null> {
  try {
    const raw = await fs.readFile(path.join(skillDir, SKILL_MANIFEST_FILENAME), 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { name?: unknown }).name === 'station' &&
      typeof (parsed as { version?: unknown }).version === 'string'
    ) {
      return parsed as SkillManifest
    }

    return null
  } catch {
    return null
  }
}

export async function writeSkillManifest(skillDir: string, version: string): Promise<void> {
  const payload: SkillManifest = {
    name: 'station',
    version
  }

  await fs.writeFile(
    path.join(skillDir, SKILL_MANIFEST_FILENAME),
    JSON.stringify(payload, null, 2) + '\n',
    'utf8'
  )
}
