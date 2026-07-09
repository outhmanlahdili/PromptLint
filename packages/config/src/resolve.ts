import type { Severity } from "@prompt-lint/types"
import type { PromptlintConfig, RuleConfig } from "./schema.ts"

/**
 * A rule id that the user referenced in their config but which does not
 * exist in the supplied known-rule set. The CLI surfaces these as a
 * single human-readable warning on stderr so the developer notices a
 * stale config without failing the scan.
 */
export interface UnknownRuleReference {
  readonly ruleId: string
  readonly severity: "warning" | "error" | "info" | "off"
  readonly options?: Readonly<Record<string, unknown>>
}

/**
 * Inputs yielded by {@link resolveRules} for the rule engine.
 *
 * `ruleSeverity` maps rule ids to a severity override or `"off"` to
 * disable. `ruleOptions` maps rule ids to a per-rule options object.
 * The engine already accepts both shapes on `EngineOptions`.
 */
export interface ResolvedRules {
  readonly ruleSeverity: Readonly<Record<string, Severity | "off">>
  readonly ruleOptions: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  readonly unknown: readonly UnknownRuleReference[]
}

/**
 * Resolve the user's `rules` block against the set of known rule ids.
 *
 * Behaviour:
 * - Unknown rule ids are listed in `unknown`; they do not produce any
 *   engine input so the scan proceeds, but the CLI surface can warn.
 * - For known rule ids, the short-form string is propagated as the
 *   severity override (or `"off"` to disable).
 * - For known rule ids in the long form, both `severity` and `options`
 *   flow into `ruleSeverity` / `ruleOptions`. `severity` is optional and
 *   may be omitted when the user only wants to override options.
 * - When `rules` is undefined in the config, the result is empty inputs
 *   (no overrides) and an empty `unknown` list.
 */
export function resolveRules(
  ruleConfig: PromptlintConfig["rules"],
  knownRuleIds: ReadonlySet<string>,
): ResolvedRules {
  return doResolve(ruleConfig, knownRuleIds)
}

/**
 * Convenience: resolve rules against the rule ids in a manifest array
 * (e.g. `RULES_MANIFEST` from `@prompt-lint/rules`).
 *
 * `manifest` is intentionally typed as `readonly { id: string }[]` so
 * the config package depends only on the structural shape and never on
 * the rules package directly.
 */
export function resolveRulesAgainstManifest(
  ruleConfig: PromptlintConfig["rules"],
  manifest: readonly { readonly id: string }[],
): ResolvedRules {
  const ids = new Set<string>()
  for (const entry of manifest) {
    ids.add(entry.id)
  }
  return doResolve(ruleConfig, ids)
}

function doResolve(
  ruleConfig: PromptlintConfig["rules"],
  knownRuleIds: ReadonlySet<string>,
): ResolvedRules {
  const ruleSeverity: Record<string, Severity | "off"> = {}
  const ruleOptions: Record<string, Record<string, unknown>> = {}
  const unknown: UnknownRuleReference[] = []

  if (!ruleConfig) {
    return {
      ruleSeverity: Object.freeze(ruleSeverity),
      ruleOptions: Object.freeze(ruleOptions),
      unknown,
    }
  }

  for (const [ruleId, value] of Object.entries(ruleConfig)) {
    if (!knownRuleIds.has(ruleId)) {
      pushUnknown(unknown, ruleId, value)
      continue
    }
    applyKnown(ruleId, value, ruleSeverity, ruleOptions)
  }

  return {
    ruleSeverity: Object.freeze(ruleSeverity),
    ruleOptions: Object.freeze(ruleOptions),
    unknown,
  }
}

function pushUnknown(bucket: UnknownRuleReference[], ruleId: string, value: RuleConfig): void {
  if (typeof value === "string") {
    bucket.push({ ruleId, severity: value })
    return
  }
  const severity = value.severity ?? "warning"
  bucket.push(
    value.options === undefined
      ? { ruleId, severity }
      : { ruleId, severity, options: Object.freeze({ ...value.options }) },
  )
}

function applyKnown(
  ruleId: string,
  value: RuleConfig,
  ruleSeverity: Record<string, Severity | "off">,
  ruleOptions: Record<string, Record<string, unknown>>,
): void {
  if (typeof value === "string") {
    ruleSeverity[ruleId] = value
    return
  }
  if (value.severity !== undefined) {
    ruleSeverity[ruleId] = value.severity
  }
  if (value.options !== undefined) {
    ruleOptions[ruleId] = { ...value.options }
  }
}
