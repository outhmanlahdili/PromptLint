import type { RuleOption, Severity } from "@prompt-lint/types"

export interface RuleManifestEntry {
  readonly id: string
  readonly category: "structure" | "cost" | "security" | "quality" | "convention"
  readonly description: string
  readonly severity: Severity
  readonly autoFixable: boolean
  readonly options: readonly RuleOption[]
}

/**
 * The full V1 catalog. The order here is the order shown by `--list-rules`
 * and in the docs.
 *
 * Kept in a separate file so `index.ts` can focus on the public API and the
 * implementation list. The structural copy of this data is locked in by the
 * `assertManifestOrder` runtime guard in `index.ts`.
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
