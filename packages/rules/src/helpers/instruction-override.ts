import type { RegexMatch } from "./regex.js"
import { findAllMatches } from "./regex.js"

/**
 * Patterns that detect prompt-injection-style instruction overrides.
 *
 * These heuristics focus on the *language* an attacker would use to ask
 * the model to disregard earlier instructions. They are intentionally
 * conservative — a low-quality match should not block legitimate prompts.
 *
 * Each entry contains a `pattern` (regex) and a `hint` value used in
 * the rule message.
 */
export interface InstructionOverridePattern {
  readonly id: string
  readonly description: string
  readonly pattern: RegExp
}

export const INSTRUCTION_OVERRIDE_PATTERNS: readonly InstructionOverridePattern[] = Object.freeze([
  {
    id: "disregard-previous",
    description: "Asks the model to ignore or disregard prior instructions",
    pattern:
      /\b(?:ignore|disregard|forget|override|skip|bypass)\b[\s\S]{0,40}\b(?:previous|prior|above|earlier|initial|original|preceding|system)\b[\s\S]{0,30}\b(?:instructions?|prompts?|rules?|directives?|context|guidelines?)\b/iu,
  },
  {
    id: "reveal-system",
    description: "Attempts to expose the system prompt or hidden prompt",
    pattern:
      /\b(?:reveal|show|display|print|leak|expose|share|output|repeat|echo|dump|tell\s+me)\b[\s\S]{0,40}\b(?:system|hidden|original|initial|internal|secret|underlying|full)\b[\s\S]{0,30}\b(?:prompt|instructions?|message|context|rules?)\b/iu,
  },
  {
    id: "act-as-privileged",
    description: "Impersonates a privileged role to bypass safeguards",
    pattern:
      /\b(?:act|behave|operate|run|pretend)\s+as\s+(?:if\s+you\s+(?:were|are)\s+)?(?:a\s+|an\s+|the\s+)?(?:developer|admin|root|jailbroken|unrestricted|unfiltered|unmoderated|uncensored|privileged|supervisor|operator)\b/iu,
  },
  {
    id: "do-anything-now",
    description: "References the well-known 'DAN'-style jailbreak naming",
    pattern: /\b(?:do\s+anything\s+now|d\.?a\.?n\.?\s+mode|jailbroken|jailbreak\s+mode)\b/iu,
  },
  {
    id: "ignore-safety",
    description: "Instructs the model to ignore safety or policy filters",
    pattern:
      /\b(?:ignore|disable|turn\s+off|bypass|remove|skip|do\s+not\s+(?:apply|use))\b[\s\S]{0,40}\b(?:safety|content|policy|policies|filters?|guardrails?|restrictions?|moderation)\b/iu,
  },
])

export interface InstructionOverrideMatch extends RegexMatch {
  readonly id: string
  readonly description: string
}

/**
 * Scan `body` for any instruction-override phrasing. Returns matches in
 * pattern-definition order; duplicates within a single pattern are
 * preserved so the caller can decide whether to dedupe.
 */
export function findInstructionOverrideMatches(body: string): readonly InstructionOverrideMatch[] {
  const out: InstructionOverrideMatch[] = []
  for (const entry of INSTRUCTION_OVERRIDE_PATTERNS) {
    for (const m of findAllMatches(entry.pattern, body)) {
      out.push({ ...m, id: entry.id, description: entry.description })
    }
  }
  return out
}
