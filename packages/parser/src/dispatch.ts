import type { ParseError, ParseResult, PromptParser, RawPromptInput } from "./index.js"
import { parseMarkdownPrompt } from "./markdown.js"

export function parsePrompt(input: RawPromptInput): ParseResult {
  const parser = createParser(input.format)
  const result = parser.parse(input)
  if (result instanceof Promise) {
    throw new Error("parsePrompt called with an async parser in Phase 1")
  }
  return result
}

function unsupportedParse(format: PromptParser["format"]): (input: RawPromptInput) => ParseResult {
  return (input: RawPromptInput): ParseResult => {
    const errors: ParseError[] = [
      Object.freeze({
        message: `Unsupported prompt format: ${input.format} (${format} not yet implemented)`,
      }),
    ]
    return Object.freeze({
      file: Object.freeze({
        id: "",
        path: input.path,
        format: input.format,
        body: "",
        frontmatter: Object.freeze({}),
        variables: Object.freeze([]),
        contentHash: "",
      }),
      errors: Object.freeze(errors),
    })
  }
}

export function createParser(format: PromptParser["format"]): PromptParser {
  if (format === "prompt.md") {
    return Object.freeze({
      format,
      parse: (input: RawPromptInput) => parseMarkdownPrompt(input),
    })
  }
  // Phase 1 only implements markdown; json/ts parsers come in Phase 2.
  const fallback = unsupportedParse(format)
  return Object.freeze({
    format,
    parse: fallback,
  })
}
