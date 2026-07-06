import type { RuleDefinition, RuleOption, Severity } from "@promptlint/types"

/**
 * Categories of V1 rules. Used by reporters to group findings and by
 * the docs generator to filter rules per category page.
 */
export type RuleCategory = "structure" | "cost" | "security" | "quality" | "convention"

/**
 * Metadata-only descriptor for a rule, exported before implementation.
 * Phase 0 ships one descriptor per declared rule so the manifest is a
 * complete artifact; Phase 2 fills in the `check` function. Both phases
 * re-export the same shape via `@promptlint/types`'s `RuleDefinition`.
 */
export interface RuleManifestEntry {
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
 */
export const RULES_MANIFEST: readonly RuleManifestEntry[] = Object.freeze([
  {
    id: "structure/missing-model",
    category: "structure",
    description: "Detects prompt files without a `model` field in their frontmatter.",
    severity: "warning",
    autoFixable: false,
    options: [],
  },
  {
    id: "structure/missing-description",
    category: "structure",
    description: "Detects prompt files without a `description` field in their frontmatter.",
    severity: "warning",
    autoFixable: false,
    options: [],
  },
  {
    id: "structure/unused-variable",
    category: "structure",
    description: "Flags variables defined in frontmatter but never referenced in the prompt body.",
    severity: "warning",
    autoFixable: false,
    options: [],
  },
  {
    id: "structure/undefined-variable",
    category: "structure",
    description: "Flags variables referenced in the prompt body but not declared in frontmatter.",
    severity: "error",
    autoFixable: false,
    options: [],
  },
  {
    id: "cost/high-token-estimate",
    category: "cost",
    description:
      "Estimates the body token count and flags prompts that exceed the configured threshold.",
    severity: "warning",
    autoFixable: false,
    options: [
      {
        name: "maxTokens",
        type: "number",
        default: 2000,
        description: "Maximum allowed tokens before the rule fires.",
      },
    ],
  },
  {
    id: "security/pii-pattern",
    category: "security",
    description:
      "Detects common PII patterns (email, phone, SSN-shaped digits, credit-card-shaped numbers) in prompt bodies.",
    severity: "error",
    autoFixable: false,
    options: [],
  },
  {
    id: "security/instruction-override-pattern",
    category: "security",
    description:
      "Flags prompt bodies containing instruction-override phrasing or that encourage such phrasing.",
    severity: "warning",
    autoFixable: false,
    options: [],
  },
  {
    id: "quality/missing-output-schema",
    category: "quality",
    description:
      "Flags prompts that request structured data without an accompanying JSON Schema in frontmatter.",
    severity: "warning",
    autoFixable: false,
    options: [],
  },
  {
    id: "quality/vague-quantifier-language",
    category: "quality",
    description:
      'Flags vague quantifier phrases (e.g., "a few", "various", "etc.", "and so on") in prompt bodies.',
    severity: "info",
    autoFixable: false,
    options: [],
  },
  {
    id: "convention/filename-naming",
    category: "convention",
    description: "Enforces `kebab-case` naming for prompt files.",
    severity: "info",
    autoFixable: false,
    options: [],
  },
])

/**
 * Look up a manifest entry by id. Phase 2 returns the implemented rule
 * from this lookup; tests in Phase 0 verify the catalog content is stable.
 */
export function findManifestEntry(id: string): RuleManifestEntry | undefined {
  return RULES_MANIFEST.find((r) => r.id === id)
}

/**
 * Sentinel convenience: Phase 2 implements `getImplementedRules` which
 * returns the live `RuleDefinition` list. Phase 0 provides this thin
 * shape so consumer code can be written against the API without
 * branching on phase availability.
 */
export function definedRuleIds(): readonly string[] {
  return RULES_MANIFEST.map((r) => r.id)
}

export type { RuleDefinition, RuleOption, Severity }
