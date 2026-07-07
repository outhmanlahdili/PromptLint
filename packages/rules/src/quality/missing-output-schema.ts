import { defineRule } from "@promptlint/rule-engine"
import type { RuleDefinition } from "@promptlint/types"
import { hasStructuredDataKeyword } from "../helpers/index.js"

/**
 * `quality/missing-output-schema`
 *
 * Reports a finding when a prompt's body requests structured output
 * (e.g. JSON, YAML, CSV, a table) but the frontmatter does not declare
 * an `outputSchema`. The presence of `outputSchema` is the convention
 * the engine uses to drive post-validation in later phases.
 *
 * Prompts whose body looks like free-form natural language are not
 * flagged, even when their frontmatter also lacks a schema.
 */
const missingOutputSchemaRule: RuleDefinition = defineRule({
  id: "quality/missing-output-schema",
  description:
    "Flags prompts that request structured data without an accompanying JSON Schema in frontmatter.",
  defaultSeverity: "warning",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    if (file.frontmatter.outputSchema !== undefined) {
      return { findings: [] }
    }
    if (!hasStructuredDataKeyword(file.body)) {
      return { findings: [] }
    }
    report({
      message:
        "Prompt requests structured output but does not declare an `outputSchema` in frontmatter.",
      severity: "warning",
      suggestions: [
        "Add an `outputSchema:` entry to the frontmatter that describes the expected JSON shape.",
        "If the response is meant to be unstructured prose, remove the structured-data phrasing from the body.",
        "Use a `$ref` to an existing schema under `./schemas/` to keep prompts composable.",
      ],
    })
    return { findings: [] }
  },
})

export default missingOutputSchemaRule
