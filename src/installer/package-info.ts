import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = '@btraut/station'

async function tryReadJson(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export async function resolveCliPackageRootDir(): Promise<string> {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i++) {
    const candidate = path.join(dir, 'package.json')
    const parsed = (await tryReadJson(candidate)) as { name?: unknown } | null
    if (parsed?.name === PACKAGE_NAME) {
      return dir
    }

    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }

    dir = parent
  }

  throw new Error('Unable to locate Station package root (package.json).')
}

export async function readCliPackageVersion(): Promise<string> {
  const rootDir = await resolveCliPackageRootDir()
  const pkgPath = path.join(rootDir, 'package.json')
  const parsed = (await tryReadJson(pkgPath)) as { version?: unknown } | null
  if (typeof parsed?.version !== 'string' || parsed.version.length === 0) {
    throw new Error(`Unable to read version from ${pkgPath}`)
  }

  return parsed.version
}

export async function resolveSkillSourceDir(): Promise<string> {
  const rootDir = await resolveCliPackageRootDir()
  const packaged = path.join(rootDir, 'skills', 'station')

  try {
    await fs.stat(packaged)
    return packaged
  } catch {
    // no-op
  }

  const repoRoot = path.resolve(rootDir, '..')
  const fallback = path.join(repoRoot, 'skills', 'station')
  try {
    await fs.stat(fallback)
    return fallback
  } catch {
    // no-op
  }

  throw new Error(
    `Unable to locate Station skill. Expected ${packaged} (npm install) or ${fallback} (repo dev).`
  )
}
