import type { RegexMatch } from "./regex.js"
import { findAllMatches } from "./regex.js"

/**
 * Patterns for detecting personally-identifiable information (PII) inside
 * prompt bodies. The rule fires once per **unique kind** of detection
 * (e.g. one `email`, one `phone`) so the configured severity is not
 * multiplied by repetition in tests.
 *
 * Each pattern uses non-greedy matching with unicode-aware boundaries.
 * URLs containing PII (e.g. `mailto:` links) intentionally still match
 * because the rule targets raw payload bytes, not transport.
 *
 * Each pattern is exposed via {@link PII_PATTERNS} so reporters can
 * surface the matched pattern type in the message.
 */
export const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gu,
  phone: /(?:\+?\d{1,3}[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d[ -]?){13,16}\b/g,
} as const

export type PiiKind = keyof typeof PII_PATTERNS

export interface PiiMatch extends RegexMatch {
  readonly kind: PiiKind
}

/**
 * Detect all PII matches in `body`. Returns one entry per pattern kind.
 * Duplicate matches of the same kind are kept so the rule implementation
 * can decide whether to dedupe.
 */
export function detectPiiMatches(body: string): readonly PiiMatch[] {
  const matches: PiiMatch[] = []
  for (const kind of Object.keys(PII_PATTERNS) as PiiKind[]) {
    const pattern = PII_PATTERNS[kind]
    for (const m of findAllMatches(pattern, body)) {
      matches.push({ ...m, kind })
    }
  }
  return matches
}
