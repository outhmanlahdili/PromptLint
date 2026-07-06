import type {
  Finding,
  PromptFile,
  RuleContext,
  RuleDefinition,
  RuleOption,
  Severity,
} from "@promptlint/types"

/**
 * Resolved runner options. Defaults match the V1 success criteria
 * documented in the PRD: scan a medium-sized repo in under 5 seconds
 * on CI hardware.
 */
export interface EngineOptions {
  /** Maximum number of files processed in parallel. Defaults to CPU count. */
  readonly concurrency?: number
  /**
   * Severity threshold. Findings above this severity cause a non-zero
   * exit code. `warning` & `error` are reported as failures by default;
   * `info` is always advisory.
   */
  readonly failOn?: Severity
  /**
   * Rule definitions registered for engine invocation. The host (CLI or
   * test) supplies these explicitly in V1; the loader that reads them
   * from `@promptlint/rules` lands in Phase 1.
   */
  readonly rules: ReadonlyArray<RuleDefinition>
  /** Map from rule id to severity override or `off` to disable. */
  readonly ruleSeverity?: Readonly<Record<string, Severity | "off">>
  /** Map from rule id to per-rule options merged into the rule context. */
  readonly ruleOptions?: Readonly<Record<string, Readonly<Record<string, unknown>>>>
}

/**
 * Aggregated result of an engine run over a set of files. The CLI writes
 * this directly to the JSON reporter and the human reporter summarizes it.
 */
export interface EngineResult {
  readonly files: ReadonlyArray<PromptFile>
  readonly findings: ReadonlyArray<Finding>
  readonly stats: EngineStats
}

export interface EngineStats {
  readonly fileCount: number
  readonly ruleCount: number
  readonly durationMs: number
  /** Severity tally; mirrors the keys of datum `SEVERITY_WEIGHT`. */
  readonly bySeverity: Readonly<Record<Severity, number>>
}

/**
 * Default rule-severity passthrough. The engine never mutates the user's
 * `RuleDefinition.defaultSeverity`; instead it overlays overrides at the
 * boundary. This function centralizes that overlay for tests in Phase 1.
 */
export function resolveSeverity(
  rule: RuleDefinition,
  ruleSeverity: Readonly<Record<string, Severity | "off">> | undefined,
): Severity | null {
  const override = ruleSeverity?.[rule.id]
  if (override === "off") return null
  if (override) return override
  return rule.defaultSeverity
}

/**
 * Reduce a `RuleDefinition` to its declared options, normalized to the
 * declared default. Phase 1 tests use this to assert that defaults match
 * the documented surface.
 */
export function declaredOptions(rule: RuleDefinition): ReadonlyArray<RuleOption> {
  return rule.options ?? []
}

/**
 * Public surface for `@promptlint/rule-engine`. Phase 1 implements the
 * async dispatcher that drains files through `Promise.all`-bounded
 * parallelism and merges findings.
 */
export type { EngineOptions, EngineResult, EngineStats }
export { resolveSeverity, declaredOptions }

/**
 * Forward-declared type to satisfy `@promptlint/types` round-trips for
 * downstream packages that need the context type from a single import
 * site. The alias is fully type-safe and incurs no runtime cost.
 */
export type { RuleContext }
