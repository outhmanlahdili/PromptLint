import { defineRule } from "@prompt-lint/rule-engine"
import type { RuleDefinition } from "@prompt-lint/types"
import { collectBodyVariables, collectDeclaredVariables } from "../helpers/index.js"

/**
 * `structure/unused-variable`
 *
 * Reports a finding for every variable declared in `frontmatter.variables`
 * that is **not** referenced anywhere in the parsed prompt body. Each
 * unused variable is emitted separately so reporters can point at the
 * exact identifier.
 *
 * The rule does not emit duplicate findings even if the same name was
 * declared multiple times in the frontmatter.
 */
const unusedVariableRule: RuleDefinition = defineRule({
  id: "structure/unused-variable",
  description: "Flags variables defined in frontmatter but never referenced in the prompt body.",
  defaultSeverity: "warning",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    const declared = collectDeclaredVariables(file)
    const referenced = new Set(collectBodyVariables(file).map((v) => v.name))
    for (const name of declared) {
      if (referenced.has(name)) continue
      report({
        message: `Declared variable \`${name}\` is never referenced in the prompt body.`,
        severity: "warning",
        suggestions: [
          `Reference \`{{ ${name} }}\` somewhere in the body, or`,
          "Remove the entry from `variables:` in the frontmatter.",
        ],
      })
    }
    return { findings: [] }
  },
})

export default unusedVariableRule
