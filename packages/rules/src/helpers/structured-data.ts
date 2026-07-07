/**
 * Phrase vocabulary used to detect whether a prompt requests structured
 * output (JSON, YAML, tables, etc.) without a corresponding schema
 * declaration in frontmatter.
 *
 * The check is intentionally permissive: any natural-language signal
 * that the user expects a structured response triggers the rule. Only
 * the rule implementation decides whether the prompt qualifies for a
 * finding — see {@link hasStructuredDataKeyword}.
 */
export const STRUCTURED_DATA_KEYWORDS: readonly string[] = Object.freeze([
  "json",
  "json object",
  "json array",
  "json schema",
  "json-schema",
  "yaml",
  "toml",
  "csv",
  "table",
  "markdown table",
  "structured output",
  "structured response",
  "structured format",
  "structured form",
  "structured data",
  "with fields",
  "as an object",
  "as a json",
  "as json",
  "as a csv",
  "as csv",
  "as an array",
  "as a list",
  "as a table",
  "list of",
  "array of",
  "schema",
  "jsonobject",
  "jsonresponse",
  "respond with json",
  "respond in json",
  "reply with json",
  "reply in json",
  "return json",
  "return as json",
  "return a json",
  "return a yaml",
  "return as yaml",
  "return yaml",
  "fields:",
  "properties:",
])

/**
 * Return `true` if `body` contains any signal that the prompt
 * requests structured output. Matching is case-insensitive and
 * uses ASCII word boundaries; multi-word phrases are matched as a
 * longest-first sequence.
 */
export function hasStructuredDataKeyword(body: string): boolean {
  const lowerBody = body.toLowerCase()
  const sorted = [...STRUCTURED_DATA_KEYWORDS].sort((a, b) => b.length - a.length)
  for (const phrase of sorted) {
    const escaped = phrase.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")
    const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "u")
    if (re.test(lowerBody)) {
      return true
    }
  }
  return false
}
