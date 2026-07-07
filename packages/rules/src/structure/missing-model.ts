import { defineRule } from "@promptlint/rule-engine"
import type { RuleDefinition } from "@promptlint/types"

/**
 * `structure/missing-model`
 *
 * Reports a finding when a prompt file does not declare a `model` field
 * in its frontmatter. The model identifier is a prerequisite for many
 * downstream concerns (cost budgeting, security posture), so missing
 * values are surfaced with a `warning` by default.
 *
 * The rule fires once per file regardless of how the prompt was parsed
 * — even a malformed frontmatter blocks resolution of `model` and
 * therefore triggers the finding.
 */
const missingModelRule: RuleDefinition = defineRule({
  id: "structure/missing-model",
  description: "Detects prompt files without a `model` field in their frontmatter.",
  defaultSeverity: "warning",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    if (file.frontmatter.model === undefined) {
      report({
        message: "Prompt is missing a `model` field in its frontmatter.",
        severity: "warning",
        suggestions: [
          "Add a `model:` entry to the frontmatter (e.g. `model: gpt-5`).",
          "Set a project-wide default in `promptlint.config.*` if every prompt targets the same model.",
        ],
      })
    }
    return { findings: [] }
  },
})

export default missingModelRule
