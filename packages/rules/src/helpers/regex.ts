import type { SourceLocation } from "@prompt-lint/types"

/**
 * Lightweight regex utilities used by security and quality rules. Each
 * helper is deterministic and rejects multi-line scans to keep the
 * resulting locations accurate.
 *
 * Source-location computation uses the same 1-indexed line/column
 * convention as `@prompt-lint/parser`.
 */

export interface RegexMatch {
  readonly start: number
  readonly end: number
  readonly text: string
  readonly location: SourceLocation
}

/**
 * Build a fresh global regex from `pattern` and `flags`. This helper
 * guarantees a new `RegExp` instance every time so callers never hold
 * onto a shared `lastIndex` cursor.
 */
export function compileWordPattern(pattern: string, flags = "gu"): RegExp {
  return new RegExp(pattern, flags)
}

/**
 * Build a whole-word-aware regex from the provided identifier list. The
 * match is wrapped with `\b` word boundaries using ASCII-only matching
 * (`\b` ASCII implementation) and uses the unicode flag so non-ASCII
 * identifiers can be detected when callers pass them.
 *
 * The pattern is anchored loosely: callers decide whether to wrap the
 * result with `^` or `$`.
 */
export function compileWordRegex(words: readonly string[], flags = "gu"): RegExp {
  const sorted = [...words].sort((a, b) => b.length - a.length)
  const escaped = sorted.map(escapeRegex)
  const body = escaped.map((w) => `\\b${w}\\b`).join("|")
  return new RegExp(body, flags)
}

/**
 * Escape a literal string for safe inclusion in a `RegExp` pattern.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")
}

/**
 * Run a regex against `body` and emit deterministic
 * `{ start, end, text, location }` matches in source order.
 *
 * If the supplied regex does not carry the `g` flag, this helper wraps
 * a clone that does. Use this for every "find all" path so callers do
 * not have to remember the global requirement of `String.matchAll`.
 */
export function findAllMatches(regex: RegExp, body: string): readonly RegexMatch[] {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`
  const pattern = new RegExp(regex.source, flags)
  pattern.lastIndex = 0
  const out: RegexMatch[] = []
  for (const match of body.matchAll(pattern)) {
    const text = match[0] ?? ""
    const start = match.index ?? 0
    const end = start + text.length
    out.push({
      start,
      end,
      text,
      location: locationForRange(body, start, end),
    })
  }
  return out
}

/**
 * Compute the 1-indexed `SourceLocation` covering `body[start..end)`.
 *
 * If `body` ends with a newline at `end`, the returned `endColumn` is
 * `1` — the start of the next line — to match the LSP convention used
 * by `@prompt-lint/parser`.
 */
export function locationForRange(body: string, start: number, end: number): SourceLocation {
  const before = body.slice(0, start)
  const beforeLines = before.split("\n")
  const startLine = beforeLines.length
  const startColumn = (beforeLines[beforeLines.length - 1]?.length ?? 0) + 1

  const span = body.slice(start, end)
  const spanLines = span.split("\n")
  const endLine = startLine + spanLines.length - 1
  let endColumn = spanLines[spanLines.length - 1]?.length ?? 0
  if (span.includes("\n") && endColumn === 0) {
    endColumn = 1
  }
  if (endColumn === 0) endColumn = 1

  return { line: startLine, column: startColumn, endLine, endColumn }
}
