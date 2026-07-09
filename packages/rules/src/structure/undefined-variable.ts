import { defineRule } from "@prompt-lint/rule-engine"
import type { RuleDefinition } from "@prompt-lint/types"
import { collectBodyVariables, collectDeclaredVariables } from "../helpers/index.js"

/**
 * `structure/undefined-variable`
 *
 * Reports a finding for every variable referenced in the prompt body
 * that is **not** declared in `frontmatter.variables`. Unknown variables
 * are an `error` because the engine cannot resolve them safely at runtime.
 *
 * Findings point at the *first* location of the missing variable so that
 * reporters can highlight the offending token. When the prompt declares
 * no variables at all, every referenced variable is reported.
 */
const undefinedVariableRule: RuleDefinition = defineRule({
  id: "structure/undefined-variable",
  description: "Flags variables referenced in the prompt body but not declared in frontmatter.",
  defaultSeverity: "error",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    const declared = new Set(collectDeclaredVariables(file))
    const referenced = collectBodyVariables(file)
    for (const ref of referenced) {
      if (declared.has(ref.name)) continue
      report({
        message: `Variable \`${ref.name}\` is referenced in the body but not declared in frontmatter.`,
        severity: "error",
        location: ref.firstLocation,
        suggestions: [
          `Add \`${ref.name}\` to the \`variables:\` list in frontmatter, or`,
          "Replace the reference with a literal value if no substitution is intended.",
        ],
      })
    }
    return { findings: [] }
  },
})

export default undefinedVariableRule
