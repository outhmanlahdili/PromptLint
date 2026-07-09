import type { RuleDefinition, RuleOption, Severity } from "@prompt-lint/types"
import conventionFilenameNaming from "./convention/filename-naming.js"
import costHighTokenEstimate from "./cost/high-token-estimate.js"
import { RULES_MANIFEST } from "./generated/manifest.js"
import qualityMissingOutputSchema from "./quality/missing-output-schema.js"
import qualityVagueQuantifierLanguage from "./quality/vague-quantifier-language.js"
import securityInstructionOverridePattern from "./security/instruction-override-pattern.js"
import securityPiiPattern from "./security/pii-pattern.js"
import structureMissingDescription from "./structure/missing-description.js"
import structureMissingModel from "./structure/missing-model.js"
import structureUndefinedVariable from "./structure/undefined-variable.js"
import structureUnusedVariable from "./structure/unused-variable.js"

/**
 * Categories of V1 rules. Used by reporters to group findings and by
 * the docs generator to filter rules per category page.
 */
export type RuleCategory = "structure" | "cost" | "security" | "quality" | "convention"

/**
 * Metadata-only descriptor for a rule, exported before implementation.
 * Phase 0 ships one descriptor per declared rule so the manifest is a
 * complete artifact; Phase 3 fills in the `check` function. Both phases
 * re-export the same shape via `@prompt-lint/types`'s `RuleDefinition`.
 */
export type RuleManifestEntry = {
  readonly id: string
  readonly category: RuleCategory
  readonly description: string
  readonly severity: Severity
  readonly autoFixable: boolean
  readonly options: readonly RuleOption[]
}

/**
 * The full V1 catalog. The order here is the order shown by `--list-rules`
 * and in the docs.
 *
 * The entries live in `generated/manifest.ts` to keep this file focused on
 * the public API; the order here is the canonical order that
 * `getImplementedRules()` returns.
 */
export { RULES_MANIFEST }

/**
 * Look up a manifest entry by id. Phase 3 returns the implemented rule
 * from this lookup; tests in Phase 0 verify the catalog content is stable.
 */
export function findManifestEntry(id: string): RuleManifestEntry | undefined {
  return RULES_MANIFEST.find((r) => r.id === id)
}

/**
 * Return the list of declared rule ids. Phase 3 also exposes this as a
 * side-effect of `getImplementedRules()`; the legacy function is retained
 * for API stability with the Phase 0 surface.
 */
export function definedRuleIds(): readonly string[] {
  return RULES_MANIFEST.map((r) => r.id)
}

/**
 * Every implemented rule, in the order defined by `RULES_MANIFEST`.
 *
 * Callers that want to feed `runEngine` should iterate the result here
 * rather than referencing the individual imports. This keeps the public
 * surface stable when rule files move or are renamed.
 */
export function getImplementedRules(): readonly RuleDefinition[] {
  return Object.freeze(IMPLEMENTED_RULES)
}

export {
  structureMissingModel,
  structureMissingDescription,
  structureUnusedVariable,
  structureUndefinedVariable,
  costHighTokenEstimate,
  securityPiiPattern,
  securityInstructionOverridePattern,
  qualityMissingOutputSchema,
  qualityVagueQuantifierLanguage,
  conventionFilenameNaming,
}

export type { RuleDefinition, RuleOption, Severity }

// ---------------------------------------------------------------------------
// Implementation order MUST match `RULES_MANIFEST`. The build will panic
// at module-load time if the two lists drift apart, which is a deliberate
// guard against silent reordering.
// ---------------------------------------------------------------------------

const IMPLEMENTED_RULES: readonly RuleDefinition[] = [
  structureMissingModel,
  structureMissingDescription,
  structureUnusedVariable,
  structureUndefinedVariable,
  costHighTokenEstimate,
  securityPiiPattern,
  securityInstructionOverridePattern,
  qualityMissingOutputSchema,
  qualityVagueQuantifierLanguage,
  conventionFilenameNaming,
]

function assertManifestOrder(): void {
  if (IMPLEMENTED_RULES.length !== RULES_MANIFEST.length) {
    throw new Error(
      `[promptlint/rules] getImplementedRules length (${IMPLEMENTED_RULES.length}) does not match RULES_MANIFEST length (${RULES_MANIFEST.length}).`,
    )
  }
  for (let i = 0; i < IMPLEMENTED_RULES.length; i += 1) {
    const rule = IMPLEMENTED_RULES[i]
    const entry = RULES_MANIFEST[i]
    if (rule === undefined || entry === undefined) {
      throw new Error(
        `[promptlint/rules] missing rule or manifest entry at index ${i}; this should be unreachable.`,
      )
    }
    if (rule.id !== entry.id) {
      throw new Error(
        `[promptlint/rules] order drift at index ${i}: expected \`${entry.id}\` but got \`${rule.id}\`.`,
      )
    }
  }
}

assertManifestOrder()
