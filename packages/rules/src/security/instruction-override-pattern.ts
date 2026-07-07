import { defineRule } from "@promptlint/rule-engine"
import type { RuleDefinition } from "@promptlint/types"
import { findInstructionOverrideMatches } from "../helpers/index.js"

/**
 * `security/instruction-override-pattern`
 *
 * Reports a finding when the prompt body — or instructions encouraging
 * such phrasing — contains language that attempts to override or
 * reveal the system prompt. The patterns are deliberately conservative;
 * phrasing a developer would normally use when authoring a system
 * prompt is not flagged.
 *
 * The rule emits one finding per detected `(pattern-id, start)`
 * occurrence so reporters can highlight the exact token. Findings are
 * sorted by source order to keep the output deterministic.
 */
const instructionOverrideRule: RuleDefinition = defineRule({
  id: "security/instruction-override-pattern",
  description:
    "Flags prompt bodies containing instruction-override phrasing or that encourage such phrasing.",
  defaultSeverity: "warning",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    const matches = findInstructionOverrideMatches(file.body)
    for (const match of matches) {
      report({
        message: `Detected instruction-override phrasing (${match.id}): \`${match.text.trim()}\`.`,
        severity: "warning",
        location: match.location,
        suggestions: [
          "Rephrase the body to remove the override-style language.",
          "If this is a test of model robustness, gate it behind a separate, clearly-labeled prompt file.",
          "Document the pattern in your team's contribution guide so future contributors recognize it.",
        ],
      })
    }
    return { findings: [] }
  },
})

export default instructionOverrideRule
