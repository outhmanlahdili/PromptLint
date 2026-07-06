import type { SourceLocation } from "@promptlint/types"

export interface YamlParseResult {
  readonly value: Readonly<Record<string, unknown>>
  readonly errors: readonly YamlParseError[]
}

export interface YamlParseError {
  readonly message: string
  readonly location: SourceLocation
}

const YAML_BOOLEAN_TRUE = new Set(["true", "True", "TRUE", "yes", "Yes", "YES", "on", "On", "ON"])
const YAML_BOOLEAN_FALSE = new Set([
  "false",
  "False",
  "FALSE",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF",
])

export function parseYaml(source: string, baseLine = 1): YamlParseResult {
  const trimmed = source.replace(/^\uFEFF/, "")
  if (trimmed.length === 0) {
    return { value: {}, errors: [] }
  }

  const lines = trimmed.split(/\r?\n/)
  const state: ParseState = {
    index: 0,
    lines,
    baseLine,
    errors: [],
  }

  try {
    const value = parseBlockMapping(state, 0)
    if (value === null) {
      return { value: {}, errors: state.errors }
    }
    skipBlankLines(state)
    if (state.index < state.lines.length) {
      state.errors.push({
        message: "Unexpected content after YAML document end.",
        location: locationOf(state),
      })
      return { value: {}, errors: state.errors }
    }
    return { value, errors: state.errors }
  } catch (err) {
    if (err instanceof YamlError) {
      state.errors.push({ message: err.message, location: err.location })
      return { value: {}, errors: state.errors }
    }
    throw err
  }
}

interface ParseState {
  index: number
  lines: readonly string[]
  baseLine: number
  errors: YamlParseError[]
}

class YamlError extends Error {
  constructor(
    message: string,
    public readonly location: SourceLocation,
  ) {
    super(message)
  }
}

function locationOf(state: ParseState): SourceLocation {
  const line = state.baseLine + state.index
  return { line, column: 1, endLine: line, endColumn: 1 }
}

function skipBlankLines(state: ParseState): void {
  while (state.index < state.lines.length) {
    const raw = state.lines[state.index]
    if (raw === undefined) break
    if (raw.trim().length > 0 && !raw.trim().startsWith("#")) break
    state.index += 1
  }
}

function parseBlockMapping(state: ParseState, indent: number): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  while (state.index < state.lines.length) {
    const raw = state.lines[state.index]
    if (raw === undefined) break
    if (raw.trim().length === 0 || raw.trim().startsWith("#")) {
      state.index += 1
      continue
    }
    const currentIndent = countLeadingSpaces(raw)
    if (currentIndent < indent) break
    if (currentIndent > indent) {
      state.errors.push({
        message: `Unexpected indentation at column ${currentIndent + 1}; expected ${indent}.`,
        location: locationOf(state),
      })
      state.index += 1
      continue
    }
    const trimmed = raw.trim()
    const colonIndex = findKeyColon(trimmed)
    if (colonIndex === -1) {
      state.errors.push({
        message: `Expected "key:" at line beginning "${trimmed}".`,
        location: locationOf(state),
      })
      state.index += 1
      continue
    }
    const key = trimmed.slice(0, colonIndex).trim()
    const rest = trimmed.slice(colonIndex + 1).trim()
    state.index += 1
    if (Object.hasOwn(result, key)) {
      state.errors.push({
        message: `Duplicate key "${key}" in mapping.`,
        location: locationOf(state),
      })
      continue
    }
    if (rest.length === 0) {
      const nested = parseBlockNode(state, indent + 2)
      result[key] = nested ?? null
      continue
    }
    result[key] = parseScalar(rest, state, locationOf(state))
  }
  return result
}

function parseBlockNode(state: ParseState, indent: number): unknown {
  skipBlankLines(state)
  if (state.index >= state.lines.length) return null
  const raw = state.lines[state.index]
  if (raw === undefined) return null
  const currentIndent = countLeadingSpaces(raw)
  if (currentIndent < indent) return null
  const trimmed = raw.trim()
  if (trimmed.startsWith("- ")) {
    return parseBlockSequence(state, indent)
  }
  if (findKeyColon(trimmed) !== -1) {
    return parseBlockMapping(state, indent)
  }
  state.index += 1
  return parseScalar(trimmed, state, locationOf(state))
}

function parseBlockSequence(state: ParseState, indent: number): unknown[] {
  const items: unknown[] = []
  while (state.index < state.lines.length) {
    const raw = state.lines[state.index]
    if (raw === undefined) break
    if (raw.trim().length === 0 || raw.trim().startsWith("#")) {
      state.index += 1
      continue
    }
    const currentIndent = countLeadingSpaces(raw)
    if (currentIndent < indent) break
    const trimmed = raw.trim()
    if (!trimmed.startsWith("- ")) break
    const valuePart = trimmed.slice(2).trim()
    state.index += 1
    if (valuePart.length === 0) {
      const nested = parseBlockNode(state, indent + 2)
      items.push(nested ?? null)
      continue
    }
    if (findKeyColon(valuePart) !== -1) {
      state.index -= 1
      const mapping = parseBlockMapping(state, indent + 2) as Record<string, unknown>
      const collected: Record<string, unknown> = {}
      for (const k of Object.keys(mapping)) {
        collected[k] = mapping[k]
      }
      items.push(collected)
      continue
    }
    items.push(parseScalar(valuePart, state, locationOf(state)))
  }
  return items
}

function findKeyColon(trimmed: string): number {
  const colon = trimmed.indexOf(":")
  if (colon <= 0) return -1
  const prev = trimmed.charAt(colon - 1)
  if (prev === "\\") return -1
  const next = trimmed.charAt(colon + 1)
  if (next === undefined || next === " " || next === "\t" || next === "") {
    return colon
  }
  return -1
}

function countLeadingSpaces(line: string): number {
  let count = 0
  for (const char of line) {
    if (char === " ") count += 1
    else break
  }
  return count
}

function parseScalar(raw: string, _state: ParseState, location: SourceLocation): unknown {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return ""
  if (trimmed === "~" || trimmed === "null" || trimmed === "Null" || trimmed === "NULL") {
    return null
  }
  if (trimmed === "true" || YAML_BOOLEAN_TRUE.has(trimmed)) return true
  if (trimmed === "false" || YAML_BOOLEAN_FALSE.has(trimmed)) return false
  const first = trimmed.charCodeAt(0)
  if (first === 0x22 /* " */ || first === 0x27 /* ' */) {
    return parseQuotedString(trimmed, location)
  }
  if (first === 0x7b /* { */) return parseFlowMapping(trimmed, location)
  if (first === 0x5b /* [ */) return parseFlowSequence(trimmed, location)
  if (looksLikeInteger(trimmed) || looksLikeFloat(trimmed)) {
    return parseNumberLiteral(trimmed, location)
  }
  return trimmed
}

function parseNumberLiteral(value: string, location: SourceLocation): number {
  const n = Number(value)
  if (Number.isFinite(n)) return n
  throw new YamlError(`Invalid number literal: "${value}".`, location)
}

function looksLikeInteger(value: string): boolean {
  return /^-?\d+$/.test(value)
}

function looksLikeFloat(value: string): boolean {
  return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value) && (value.includes(".") || /[eE]/.test(value))
}

function parseQuotedString(raw: string, location: SourceLocation): string {
  const quote = raw.charAt(0)
  if (raw.length < 2 || raw.charAt(raw.length - 1) !== quote) {
    throw new YamlError(`Unterminated quoted string: "${raw}".`, location)
  }
  const inner = raw.slice(1, -1)
  if (quote === '"') {
    return inner
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
  }
  return inner.replace(/''/g, "'").replace(/\\'/g, "'")
}

function parseFlowMapping(raw: string, location: SourceLocation): Record<string, unknown> {
  const inner = raw.slice(1, -1).trim()
  const result: Record<string, unknown> = {}
  if (inner.length === 0) return result
  const parts = splitFlow(inner, ",")
  for (const part of parts) {
    const trimmedPart = part.trim()
    if (trimmedPart.length === 0) continue
    const colonIndex = findKeyColon(trimmedPart)
    if (colonIndex === -1) {
      throw new YamlError(`Invalid flow mapping entry: "${trimmedPart}".`, location)
    }
    const key = trimmedPart.slice(0, colonIndex).trim()
    const valuePart = trimmedPart.slice(colonIndex + 1).trim()
    if (Object.hasOwn(result, key)) {
      throw new YamlError(`Duplicate key "${key}" in flow mapping.`, location)
    }
    result[key] = parseScalar(valuePart, { index: 0, lines: [], baseLine: 0, errors: [] }, location)
  }
  return result
}

function parseFlowSequence(raw: string, location: SourceLocation): unknown[] {
  const inner = raw.slice(1, -1).trim()
  if (inner.length === 0) return []
  const parts = splitFlow(inner, ",")
  return parts.map((part) =>
    parseScalar(part.trim(), { index: 0, lines: [], baseLine: 0, errors: [] }, location),
  )
}

function splitFlow(source: string, separator: string): string[] {
  const result: string[] = []
  let depth = 0
  let inSingle = false
  let inDouble = false
  let buffer = ""
  for (let i = 0; i < source.length; i += 1) {
    const ch = source.charAt(i)
    if (ch === "\\" && i + 1 < source.length) {
      buffer += ch + (source.charAt(i + 1) ?? "")
      i += 1
      continue
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle
    } else if (!inSingle && !inDouble) {
      if (ch === "{" || ch === "[") depth += 1
      else if (ch === "}" || ch === "]") depth -= 1
      else if (ch === separator && depth === 0) {
        result.push(buffer)
        buffer = ""
        continue
      }
    }
    buffer += ch
  }
  if (buffer.length > 0) result.push(buffer)
  return result
}
