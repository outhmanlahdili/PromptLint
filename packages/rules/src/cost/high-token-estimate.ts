import { defineRule } from "@prompt-lint/rule-engine"
import type { Finding, RuleDefinition, RuleOption } from "@prompt-lint/types"
import { estimateTokens } from "../helpers/index.js"

/**
 * `cost/high-token-estimate`
 *
 * Estimates the token count of a prompt body using the pure helper
 * `estimateTokens`. When the estimate exceeds the configured
 * `maxTokens` option (default 2000), a single `warning` finding is
 * emitted carrying the actual and threshold values in the message.
 *
 * The rule never reports twice for the same file: only one finding is
 * ever produced, regardless of how many pre-flight estimates change.
 *
 * Options:
 *   - `maxTokens` (number, default 2000): upper bound for the
 *     estimated token count. Setting this to a non-positive number
 *     effectively disables the rule (no finding is emitted).
 */
interface HighTokenEstimateOptions {
  readonly maxTokens: number
}

const HIGH_TOKEN_OPTIONS: readonly RuleOption[] = Object.freeze([
  Object.freeze({
    name: "maxTokens",
    type: "number",
    default: 2000,
    description: "Maximum allowed tokens before the rule fires.",
  }),
])

function readMaxTokens(options: Readonly<Record<string, unknown>>): number {
  const raw = options.maxTokens
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw
  }
  return 2000
}

const findingShapeFor = (
  message: string,
  severity: Finding["severity"],
): Omit<Finding, "ruleId" | "fileId" | "filePath"> => ({
  message,
  severity,
  suggestions: [
    "Trim the prompt body to focus on the essential instructions.",
    "Split the prompt into smaller reusable components referenced by the main prompt.",
    "Raise the `maxTokens` threshold if the long prompt is intentional.",
  ],
})

const highTokenEstimateRule: RuleDefinition = defineRule({
  id: "cost/high-token-estimate",
  description:
    "Estimates the body token count and flags prompts that exceed the configured threshold.",
  defaultSeverity: "warning",
  options: HIGH_TOKEN_OPTIONS,
  check: ({ file, options, report }) => {
    const cfg = options as Partial<HighTokenEstimateOptions>
    const maxTokens = cfg.maxTokens !== undefined ? cfg.maxTokens : readMaxTokens(options)
    if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens)) {
      return { findings: [] }
    }
    if (maxTokens <= 0) {
      return { findings: [] }
    }

    const estimate = estimateTokens(file.body)
    if (estimate > maxTokens) {
      report({
        ...findingShapeFor(
          `Prompt body is estimated at ${estimate} tokens, exceeding the configured maximum of ${maxTokens}.`,
          "warning",
        ),
      })
    }
    return { findings: [] }
  },
})

export default highTokenEstimateRule
