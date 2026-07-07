import { defineRule } from "@promptlint/rule-engine"
import type { RuleDefinition } from "@promptlint/types"
import { detectPiiMatches } from "../helpers/index.js"

/**
 * `security/pii-pattern`
 *
 * Reports findings when the prompt body contains a recognizable PII
 * pattern: email, phone number, US-style SSN, or credit-card-shaped
 * digit blocks. Each distinct occurrence of each pattern kind
 * produces its own finding, with a stable ordering that traces the
 * source of the match.
 *
 * The rule uses the helper `detectPiiMatches` so the matrix of
 * patterns lives in a single, auditable file. Tests verify the
 * deterministic ordering and the absence of duplicate findings for
 * the same `(kind, start)` pair.
 */
const piiPatternRule: RuleDefinition = defineRule({
  id: "security/pii-pattern",
  description:
    "Detects common PII patterns (email, phone, SSN-shaped digits, credit-card-shaped numbers) in prompt bodies.",
  defaultSeverity: "error",
  options: Object.freeze([]),
  check: ({ file, report }) => {
    const matches = detectPiiMatches(file.body)
    for (const match of matches) {
      const builder = PII_MESSAGE_BY_KIND[match.kind]
      const suggestions = PII_SUGGESTIONS_BY_KIND[match.kind]
      if (builder === undefined || suggestions === undefined) continue
      report({
        message: builder(match.text),
        severity: "error",
        location: match.location,
        suggestions,
      })
    }
    return { findings: [] }
  },
})

const PII_MESSAGE_BY_KIND: Record<string, ((text: string) => string) | undefined> = {
  email: (text) => `Detected an email address (\`${text}\`) in the prompt body.`,
  phone: (text) => `Detected a phone-number-shaped value (\`${text}\`) in the prompt body.`,
  ssn: (text) => `Detected a US-style SSN (\`${text}\`) in the prompt body.`,
  creditCard: (text) => `Detected a credit-card-shaped number (\`${text}\`) in the prompt body.`,
}

const PII_SUGGESTIONS_COMMON = [
  "Move the personal data to environment variables or a secure datastore.",
  "Reference the data via a `{{ variable }}` substitution rather than inlining it.",
] as const

const PII_SUGGESTIONS_BY_KIND: Record<string, readonly string[] | undefined> = {
  email: PII_SUGGESTIONS_COMMON,
  phone: PII_SUGGESTIONS_COMMON,
  ssn: PII_SUGGESTIONS_COMMON,
  creditCard: PII_SUGGESTIONS_COMMON,
}

export default piiPatternRule
