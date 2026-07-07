import { defineRule } from "@promptlint/rule-engine"
import type { RuleDefinition } from "@promptlint/types"

/**
 * `structure/missing-description`
 *
 * Reports a finding when a prompt file does not declare a `description`
 * field in its frontmatter. A missing description makes the prompt
 * invisible to documentation tooling and complicates code review.
 *
 * The rule fires once per file regardless of how the prompt was parsed
 * — even a malformed frontmatter blocks resolution of `description`.
 */
const missingDescriptionRule: RuleDefinition = defineRule({
  id: "structure/missing-description",
  description: "Detects prompt files without a `description` field in their frontmatter.",
  defaultSeverity: "warning",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    if (file.frontmatter.description === undefined) {
      report({
        message: "Prompt is missing a `description` field in its frontmatter.",
        severity: "warning",
        suggestions: [
          "Add a single-sentence `description:` describing the prompt's purpose.",
          "Keep the description under ~120 characters for tooltips and docs.",
        ],
      })
    }
    return { findings: [] }
  },
})

export default missingDescriptionRule
