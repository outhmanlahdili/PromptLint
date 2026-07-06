import type { PromptVariable, SourceLocation, VariableOccurrence } from "@promptlint/types"

// VariableOccurrence is defined in @promptlint/types

/**
 * Scans a prompt body for `{{ variable }}` references.
 *
 * Supported variable-name characters: letters, digits, underscore, dot, dash.
 * A trailing filter pipe (e.g. `{{ name | upper }}`) is allowed; the filter
 * name is captured for context but not currently echoed back to callers.
 */
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.\-]*)(?:\s*\|\s*[a-zA-Z0-9_.\-]*)?\s*\}\}/g

export function scanVariables(body: string, _offset = 0): readonly VariableOccurrence[] {
  const occurrences: VariableOccurrence[] = []
  let match: RegExpExecArray | null = VARIABLE_PATTERN.exec(body)

  while (match !== null) {
    const name = match[1] ?? ""
    const start = match.index
    const end = start + match[0].length

    const before = body.slice(0, start)
    const lines = before.split("\n")
    const line = lines.length
    const column = (lines[lines.length - 1]?.length ?? 0) + 1

    const after = body.slice(start, end)
    const endLines = after.split("\n")
    const endLine = line + endLines.length - 1
    const endColumn = endLines[endLines.length - 1]?.length || 1

    occurrences.push({
      name,
      location: {
        line,
        column,
        endLine,
        endColumn,
      },
    })

    match = VARIABLE_PATTERN.exec(body)
  }

  return Object.freeze(occurrences)
}

/**
 * Groups {@link VariableOccurrence}s by name, preserving the order in which
 * each name first appears in the source body.
 */
export function collectVariables(
  occurrences: readonly VariableOccurrence[],
): readonly PromptVariable[] {
  const groups = new Map<string, SourceLocation[]>()
  const declaredOrder: string[] = []

  for (const occ of occurrences) {
    const existing = groups.get(occ.name)
    if (existing !== undefined) {
      existing.push(occ.location)
    } else {
      groups.set(occ.name, [occ.location])
      declaredOrder.push(occ.name)
    }
  }

  return Object.freeze(
    declaredOrder.map((name) => {
      const locations = groups.get(name) ?? []
      return Object.freeze({ name, locations: Object.freeze(locations) })
    }),
  )
}
