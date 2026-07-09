import { defineRule } from "@prompt-lint/rule-engine"
import type { RuleDefinition } from "@prompt-lint/types"
import { extractPathBasename, isKebabCaseBasename } from "../helpers/index.js"

/**
 * `convention/filename-naming`
 *
 * Enforces that the basename of a prompt file follows `kebab-case`:
 * lowercase alphanumerics joined by single hyphens, no leading or
 * trailing hyphens. Purely-numeric segments (e.g. `e2e-001`) are
 * accepted.
 *
 * The rule fires once per file when the basename fails the check,
 * regardless of how many invalid characters or runs of punctuation
 * appear. The message reports the basename and suggests a fixed form.
 */
const filenameNamingRule: RuleDefinition = defineRule({
  id: "convention/filename-naming",
  description: "Enforces `kebab-case` naming for prompt files.",
  defaultSeverity: "info",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    const basename = extractPathBasename(file.path)
    if (isKebabCaseBasename(basename)) {
      return { findings: [] }
    }
    const suggested = toKebabCase(basename)
    report({
      message: `Prompt file basename \`${basename}\` is not kebab-case.`,
      severity: "info",
      suggestions: [
        suggested.length > 0
          ? `Rename the file to \`${suggested}.prompt.md\`.`
          : "Choose a kebab-case name made of lowercase alphanumerics and single hyphens.",
      ],
    })
    return { findings: [] }
  },
})

function toKebabCase(input: string): string {
  // Insert hyphens at camelCase boundaries: aB -> a-B, ABc -> A-Bc, etc.
  const withSeparators = input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
  const lowered = withSeparators.toLowerCase()
  const replaced = lowered.replace(/[^a-z0-9]+/g, "-")
  const trimmed = replaced.replace(/^-+|-+$/g, "")
  const collapsed = trimmed.replace(/-+/g, "-")
  return collapsed
}

export default filenameNamingRule
