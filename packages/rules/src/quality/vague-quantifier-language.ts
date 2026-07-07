import { defineRule } from "@promptlint/rule-engine"
import type { RuleDefinition } from "@promptlint/types"
import { findVagueQuantifierMatches } from "../helpers/index.js"

/**
 * `quality/vague-quantifier-language`
 *
 * Reports an `info`-severity finding for every occurrence of a vague
 * quantifier (e.g. "a few", "various", "etc.", "and so on") in the
 * prompt body. Each occurrence produces a distinct finding with a
 * `location` that points at the matched token, allowing editors to
 * highlight the phrase precisely.
 */
const vagueQuantifierRule: RuleDefinition = defineRule({
  id: "quality/vague-quantifier-language",
  description:
    'Flags vague quantifier phrases (e.g., "a few", "various", "etc.", "and so on") in prompt bodies.',
  defaultSeverity: "info",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    const matches = findVagueQuantifierMatches(file.body)
    for (const match of matches) {
      report({
        message: `Vague quantifier (\`${match.term}\`) is hard for models to interpret precisely.`,
        severity: "info",
        location: match.location,
        suggestions: [
          "Replace the phrase with a concrete number, range, or exemplar list.",
          "Spell out which items are included so the model cannot under- or over-deliver.",
        ],
      })
    }
    return { findings: [] }
  },
})

export default vagueQuantifierRule
