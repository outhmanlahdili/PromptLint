import type { Dirent } from "node:fs"
import { readdir, stat } from "node:fs/promises"
import path from "node:path"
import type { PromptFormat } from "@promptlint/types"

/**
 * A prompt file located on disk, paired with the format the parser
 * dispatcher expects. The path uses forward slashes so it is stable
 * across platforms and matches the parser's `derivePromptId` convention.
 */
export interface DiscoveredPrompt {
  readonly path: string
  readonly format: PromptFormat
}

/**
 * Directories pruned during recursive discovery. The set matches the
 * spec's "common directories" list. Directories are matched by base name
 * only (not path), which is the convention used by every major linter.
 */
export const IGNORED_DIRECTORY_NAMES: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
])

/**
 * Outcome of a discovery pass. `prompts` is always present (possibly
 * empty); `errors` carries per-entry filesystem failures so the caller
 * can report them without aborting the whole scan.
 */
export interface DiscoveryResult {
  readonly prompts: readonly DiscoveredPrompt[]
  readonly errors: readonly string[]
}

/**
 * Discover prompt files at the given target.
 *
 * - A single file is accepted as-is if it matches a prompt extension.
 * - A directory is walked recursively, pruning {@link IGNORED_DIRECTORY_NAMES}.
 * - Results are sorted by path for deterministic ordering.
 *
 * The function does not throw for missing targets or unreadable entries;
 * those are surfaced via {@link DiscoveryResult.errors} (missing target
 * is reported as an error entry) so the orchestrator owns the exit-code
 * decision.
 *
 * @param target A repository-relative or absolute file/directory path.
 */
export async function discoverPrompts(target: string): Promise<DiscoveryResult> {
  let info: Awaited<ReturnType<typeof stat>>
  try {
    info = await stat(target)
  } catch {
    return { prompts: [], errors: [`Path does not exist or is not accessible: ${target}`] }
  }

  const prompts: DiscoveredPrompt[] = []
  const errors: string[] = []

  if (info.isFile()) {
    const format = formatForFile(target)
    if (format !== null) {
      prompts.push({ path: normalizeSlashes(target), format })
    }
  } else if (info.isDirectory()) {
    await walkDirectory(target, prompts, errors)
  } else {
    // Sockets, FIFOs, etc. — nothing for PromptLint to do here.
    errors.push(`Path is neither a file nor a directory: ${target}`)
  }

  prompts.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return { prompts: Object.freeze(prompts), errors: Object.freeze(errors) }
}

/**
 * Recursively collect prompt files under `dir`, appending to the shared
 * `prompts` and `errors` buffers. Directory read failures are caught per
 * directory so one unreadable folder never aborts the whole scan.
 */
async function walkDirectory(
  dir: string,
  prompts: DiscoveredPrompt[],
  errors: string[],
): Promise<void> {
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err: unknown) {
    errors.push(readErrorMessage(`Unable to read directory: ${dir}`, err))
    return
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue
      }
      await walkDirectory(path.join(dir, entry.name), prompts, errors)
      continue
    }
    if (entry.isFile()) {
      const fullPath = path.join(dir, entry.name)
      const format = formatForFile(entry.name)
      if (format !== null) {
        prompts.push({ path: normalizeSlashes(fullPath), format })
      }
    }
  }
}

/**
 * Map a filename to its {@link PromptFormat}. Returns `null` for any name
 * that is not a recognized prompt file, so callers can simply skip it.
 *
 * The match is case-insensitive on the extension to support editors that
 * store `.Prompt.md`; the canonical format string stays lowercased.
 */
export function formatForFile(fileName: string): PromptFormat | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".prompt.md")) return "prompt.md"
  if (lower.endsWith(".prompt.ts")) return "prompt.ts"
  if (lower.endsWith(".prompt.json")) return "prompt.json"
  return null
}

function normalizeSlashes(p: string): string {
  return p.replaceAll("\\", "/")
}

function readErrorMessage(prefix: string, err: unknown): string {
  if (err instanceof Error && err.message.length > 0) {
    return `${prefix} (${err.message})`
  }
  return prefix
}
