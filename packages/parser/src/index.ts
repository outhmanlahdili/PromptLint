import type { PromptFile, PromptFormat, SourceLocation } from "@prompt-lint/types"

export interface RawPromptInput {
  readonly path: string
  readonly format: PromptFormat
  readonly source: string
}

export interface ParseResult {
  readonly file: PromptFile
  readonly errors: readonly ParseError[]
}

export interface ParseError {
  readonly message: string
  readonly location?: SourceLocation
}

export interface PromptParser {
  readonly format: PromptFormat
  parse(input: RawPromptInput): ParseResult | Promise<ParseResult>
}

export function derivePromptId(path: string): string {
  return path.replaceAll("\\", "/")
}

export { parsePrompt, createParser } from "./dispatch.js"
export { parseMarkdownPrompt } from "./markdown.js"
export { extractFrontmatter, splitFrontmatter, promptFrontmatterSchema } from "./frontmatter.js"
export { scanVariables, collectVariables } from "./variables.js"
export type { VariableOccurrence } from "@prompt-lint/types"
export { computeContentHash } from "./hash.js"
export type { ContentHashInput } from "./hash.js"
export { parseYaml } from "./yaml.js"
export type { YamlParseResult, YamlParseError } from "./yaml.js"
