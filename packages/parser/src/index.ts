import type { PromptFile, PromptFormat, SourceLocation } from "@promptlint/types"

/**
 * Raw input handed to a parser.
 *
 * Parsers MUST be deterministic and pure: identical `RawPromptInput` MUST
 * produce identical `PromptFile`. Phase 1 implements `gray-matter` for
 * `.prompt.md`, `acorn` for `.prompt.ts`, and a JSON-schema-driven object
 * validator for `.prompt.json`.
 */
export interface RawPromptInput {
  /** Repository-relative forward-slash path, e.g. `prompts/summarize.prompt.md`. */
  readonly path: string
  readonly format: PromptFormat
  /** File contents decoded as UTF-8. */
  readonly source: string
}

/**
 * Result of a parse. A failed parse still yields a file but with an empty
 * body — the engine reports it as a parse-error finding, while the rest
 * of the rules continue to receive the file as context.
 */
export interface ParseResult {
  readonly file: PromptFile
  /** Non-fatal parse issues, surfaced as findings by the engine. */
  readonly errors: ReadonlyArray<ParseError>
}

export interface ParseError {
  readonly message: string
  readonly location?: SourceLocation
}

/**
 * Format-aware parser. V1 ships three implementations; the engine
 * dispatches based on `format`.
 */
export interface PromptParser {
  readonly format: PromptFormat
  parse(input: RawPromptInput): ParseResult | Promise<ParseResult>
}

/**
 * Stable id derivation. V1 uses the path directly; caches (Phase 2+) key
 * off the same id so tests can rely on determinism.
 */
export function derivePromptId(path: string): string {
  return path.replaceAll("\\", "/")
}

export { derivePromptId }
export type { RawPromptInput, ParseResult, ParseError, PromptParser }
