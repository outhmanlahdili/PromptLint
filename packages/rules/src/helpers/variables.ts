import type { PromptFile, SourceLocation } from "@promptlint/types"

/**
 * Variable inspection helpers used by the `structure/unused-variable` and
 * `structure/undefined-variable` rules.
 *
 * The parser already produces `{ name, locations }` groups via
 * `@promptlint/parser`. We re-expose the underlying data here in stable
 * helpers so rule implementations do not have to touch the parser types
 * directly.
 */

export interface VariableReference {
  readonly name: string
  readonly firstLocation: SourceLocation
}

const FRONTMATTER_VARIABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_.\-]*$/

/**
 * Return the set of variable names declared in the frontmatter `variables`
 * array. Names that do not satisfy the parser's identifier rules are
 * skipped silently — the parser already surfaces a frontmatter error for
 * those, and re-flagging them here would create duplicate findings.
 */
export function collectDeclaredVariables(file: PromptFile): readonly string[] {
  const declared = file.frontmatter.variables
  if (declared === undefined) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of declared) {
    if (!FRONTMATTER_VARIABLE_NAME.test(name)) continue
    if (seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/**
 * Return every `{{ var }}` occurrence in the prompt body, in source order,
 * with deduplicated variable names. The first reported location per name
 * is the first one the parser recorded.
 */
export function collectBodyVariables(file: PromptFile): readonly VariableReference[] {
  const seen = new Set<string>()
  const out: VariableReference[] = []
  for (const variable of file.variables) {
    if (seen.has(variable.name)) continue
    seen.add(variable.name)
    const first = variable.locations[0]
    if (first !== undefined) {
      out.push({ name: variable.name, firstLocation: first })
    } else {
      out.push({
        name: variable.name,
        firstLocation: { line: 1, column: 1, endLine: 1, endColumn: 1 },
      })
    }
  }
  return out
}

/**
 * Test whether `name` is referenced anywhere in the parsed `PromptFile`.
 */
export function findVariableOccurrences(file: PromptFile, name: string): readonly SourceLocation[] {
  for (const variable of file.variables) {
    if (variable.name === name) return variable.locations
  }
  return []
}

/**
 * Convenience: declare-detection with case-sensitive semantics.
 */
export function isVariableMissing(file: PromptFile, name: string): boolean {
  const declared = collectDeclaredVariables(file)
  return !declared.includes(name)
}
