/**
 * Filename helpers used by `convention/filename-naming`.
 *
 * The rule operates on the basename of the prompt file's logical path
 * (which is repository-relative and uses forward slashes). The full
 * path is ignored so this rule works the same in monorepos and in
 * `os`-specific layouts.
 */

const KEBAB_CASE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Extract the basename (without recognized formatter extensions) from a
 * normalized prompt path.
 *
 * `prompt.md` / `prompt.ts` / `prompt.json` are the only extensions the
 * V1 engine understands, so the helper strips exactly one of those if
 * present. Files that match none of those extensions are returned
 * unchanged (the caller can then decide what to do).
 *
 * @example
 *   extractPathBasename("prompts/greet-user.prompt.md") // "greet-user"
 *   extractPathBasename("examples/My-Prompt.prompt.md") // "My-Prompt"
 *   extractPathBasename("foo.bar/baz")                 // "baz"
 *   extractPathBasename("noext")                       // "noext"
 */
const KNOWN_PROMPT_EXTENSIONS = [
  "prompt.md",
  "prompt.ts",
  "prompt.json",
  "md",
  "ts",
  "json",
] as const

export function extractPathBasename(path: string): string {
  const normalized = path.replaceAll("\\", "/")
  const lastSlash = normalized.lastIndexOf("/")
  const tail = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1)
  for (const ext of KNOWN_PROMPT_EXTENSIONS) {
    if (!tail.endsWith(`.${ext}`)) continue
    const without = tail.slice(0, -1 * (ext.length + 1))
    if (without.length > 0) return without
  }
  return tail
}

/**
 * Return `true` if `basename` is a valid kebab-case token: lowercase
 * alphanumerics joined by single hyphens, no leading or trailing hyphen,
 * no underscores, no spaces, no unicode letters.
 *
 * The convention allows purely numeric segments (e.g. `e2e-001`) and
 * single-word names (e.g. `summarize`).
 */
export function isKebabCaseBasename(basename: string): boolean {
  if (basename.length === 0) return false
  return KEBAB_CASE_RE.test(basename)
}
