import picomatch from "picomatch"

/**
 * A predicate that reports whether an absolute path should be ignored.
 *
 * Truthy = "the path is ignored, exclude from the scan". Falsy (always
 * including the empty string) = "keep the path".
 *
 * Implementations are built by {@link createIgnoreMatcher} from a list
 * of gitignore-style globs (`dist/**`, `coverage/**`, ...). A matcher
 * built from an empty pattern list always returns `false` ("nothing
 * ignored"); that is the desired default when no user config exists.
 */
export type IgnoreMatcher = (absolutePath: string) => boolean

/**
 * Compile a list of user-supplied glob patterns into a single
 * {@link IgnoreMatcher}.
 *
 * Glob behaviour:
 *
 * - Patterns are gitignore-style: `dist/**`, `coverage/**`, etc.
 * - User-supplied patterns are *relative*; they match any path that
 *   ends in the pattern's tree. Concretely: picomatch matches
 *   anywhere in the string by testing each path tail - i.e. if
 *   `dist/**` is the pattern, this matcher returns `true` for
 *   `/repo/dist/foo.prompt.md`, `dist/foo.prompt.md`, and
 *   `C:/repo/dist/foo.prompt.md`.
 * - Trailing `**` patterns match any descendant of the named folder.
 * - Patterns work for both forward-slash and back-slash paths because
 *   the matcher normalizes paths to forward slashes internally.
 */
export function createIgnoreMatcher(patterns: readonly string[]): IgnoreMatcher {
  const normalized = patterns.map((p) => p.trim()).filter((p) => p.length > 0)
  if (normalized.length === 0) {
    return () => false
  }
  const matcher = picomatch(normalized, { dot: true, ignore: [] })
  return (input: string) => {
    if (input.length === 0) return false
    const normalizedPath = input.replaceAll("\\", "/")
    if (matchesTail(normalizedPath, matcher)) return true
    // Some patterns are anchored to the depth of the first non-trivial
    // segment (e.g. `*/dist/**` matches at any depth). Try matching the
    // path tail starting from each segment.
    const segments = normalizedPath.split("/")
    for (let i = 1; i < segments.length; i++) {
      const tail = segments.slice(i).join("/")
      if (matcher(tail)) return true
    }
    return false
  }
}

/**
 * Check whether picomatch matches the path as-is or trimmed by the
 * first or last slash. This handles absolute paths users rarely think
 * about - we want `dist/**` to match `/repo/dist/foo`, not only when
 * the path starts with `dist/`.
 */
function matchesTail(normalizedPath: string, matcher: picomatch.Matcher): boolean {
  if (matcher(normalizedPath)) return true
  // Strip a leading slash so users can write `dist/**` (no leading slash).
  const trimmed = normalizedPath.startsWith("/") ? normalizedPath.slice(1) : normalizedPath
  if (trimmed !== normalizedPath && matcher(trimmed)) return true
  return false
}
