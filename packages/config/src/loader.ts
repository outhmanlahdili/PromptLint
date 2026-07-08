import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { DEFAULT_CONFIG } from "./defaults.js"
import { ConfigError } from "./errors.js"
import { mergeConfig } from "./merge.js"
import { promptlintConfigSchema } from "./schema.js"
import type { PromptlintConfig, PromptlintConfigInput } from "./schema.js"

const CONFIG_FILES = ["promptlint.config.ts", "promptlint.config.json"]

export interface LoadConfigResult {
  config: PromptlintConfig
  filePath: string | null
}

export async function loadConfig(cwd: string): Promise<LoadConfigResult> {
  const filePath = await findConfig(cwd)

  if (!filePath) {
    return { config: DEFAULT_CONFIG, filePath: null }
  }

  const parsedConfig = await parseConfigFile(filePath)
  const config = mergeConfig(parsedConfig)

  return { config, filePath }
}

async function findConfig(startDir: string): Promise<string | null> {
  let currentDir = path.resolve(startDir)

  while (true) {
    for (const file of CONFIG_FILES) {
      const filePath = path.join(currentDir, file)
      if (await fileExists(filePath)) {
        return filePath
      }
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      break // Reached filesystem root
    }
    currentDir = parentDir
  }

  return null
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath)
    return s.isFile()
  } catch {
    return false
  }
}

async function parseConfigFile(filePath: string): Promise<PromptlintConfigInput> {
  let userConfig: unknown

  try {
    if (filePath.endsWith(".json")) {
      const content = await readFile(filePath, "utf-8")
      userConfig = JSON.parse(content)
    } else {
      // .ts
      const mod = await import(pathToFileURL(filePath).href)
      userConfig = pickConfigExport(mod)
    }
  } catch (error) {
    throw new ConfigError(
      `Failed to load configuration file at ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  const parseResult = promptlintConfigSchema.safeParse(userConfig)

  if (!parseResult.success) {
    throw new ConfigError(`Invalid configuration in ${filePath}:\n${parseResult.error.message}`)
  }

  return parseResult.data
}

/**
 * Pick the configuration value from a TypeScript config module.
 *
 * Three accepted shapes are supported:
 *
 *   1. `export default { ... }` (default export only).
 *   2. `export const config = { ... }` (named `config` export only).
 *   3. `module.exports = { ... }` (CommonJS-style default).
 *
 * A module that exports *both* `config` and a default must use one of
 * these explicitly - we never silently mix the two. The function returns
 * the chosen value as `unknown`; the schema layer downstream rejects
 * anything that is not a valid config object.
 */
function pickConfigExport(mod: Record<string, unknown>): unknown {
  const defaultExport = mod.default
  const namedConfig = mod.config

  if (defaultExport !== undefined && defaultExport !== null) {
    return defaultExport
  }
  if (namedConfig !== undefined && namedConfig !== null) {
    return namedConfig
  }
  return mod
}
