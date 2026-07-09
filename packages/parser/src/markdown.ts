import type { PromptFile, PromptFrontmatter } from "@prompt-lint/types"
import { type FrontmatterError, extractFrontmatter } from "./frontmatter.js"
import { computeContentHash } from "./hash.js"
import type { ParseError, ParseResult, RawPromptInput } from "./index.js"
import { derivePromptId } from "./index.js"
import { collectVariables, scanVariables } from "./variables.js"

export function parseMarkdownPrompt(input: RawPromptInput): ParseResult {
  const errors: ParseError[] = []
  const frontmatterResult = extractFrontmatter(input.source)
  for (const err of frontmatterResult.errors) {
    errors.push(toParseError(err))
  }

  const bodyOffset = frontmatterResult.range.hasFrontmatter ? frontmatterResult.range.endOffset : 0
  const rawBody = frontmatterResult.range.hasFrontmatter
    ? input.source.slice(bodyOffset)
    : input.source
  const body = stripLeadingFrontmatterWhitespace(rawBody)

  const occurrences = scanVariables(body, bodyOffset)
  const variables = collectVariables(occurrences)

  const normalizedPath = derivePromptId(input.path)
  const contentHash = computeContentHash({
    path: normalizedPath,
    format: input.format,
    body,
    frontmatter: frontmatterToRecord(frontmatterResult.value),
  })

  const file: PromptFile = Object.freeze({
    id: normalizedPath,
    path: normalizedPath,
    format: input.format,
    body,
    frontmatter: frontmatterResult.value,
    variables: Object.freeze(variables),
    contentHash,
  })

  return Object.freeze({
    file,
    errors: Object.freeze(errors),
  })
}

function toParseError(err: FrontmatterError): ParseError {
  return err.location === undefined
    ? { message: err.message }
    : { message: err.message, location: err.location }
}

function stripLeadingFrontmatterWhitespace(body: string): string {
  let i = 0
  while (i < body.length) {
    const code = body.charCodeAt(i)
    if (code === 0x20 /* space */ || code === 0x09 /* tab */) {
      i += 1
      continue
    }
    if (code === 0x0a /* newline */) {
      i += 1
      continue
    }
    break
  }
  return body.slice(i)
}

function frontmatterToRecord(frontmatter: PromptFrontmatter): Readonly<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  if (frontmatter.description !== undefined) {
    out.description = frontmatter.description
  }
  if (frontmatter.model !== undefined) {
    out.model = frontmatter.model
  }
  if (frontmatter.variables !== undefined) {
    out.variables = [...frontmatter.variables]
  }
  if (frontmatter.outputSchema !== undefined) {
    out.outputSchema = { ...frontmatter.outputSchema }
  }
  if (frontmatter.extra !== undefined) {
    for (const [key, value] of Object.entries(frontmatter.extra)) {
      out[key] = value
    }
  }
  return out
}
