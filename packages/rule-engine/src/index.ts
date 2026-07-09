import type {
  Finding,
  PromptFile,
  RuleContext,
  RuleDefinition,
  RuleOption,
  Severity,
} from "@prompt-lint/types"

// ---------------------------------------------------------------------------
// Public API (Phase 0 helpers retained for backwards compatibility)
// ---------------------------------------------------------------------------

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
   * test) supplies these explicitly; the loader that reads them from
   * `@prompt-lint/rules` lands in a later phase.
   */
  readonly rules: readonly RuleDefinition[]

  /** Map from rule id to severity override or `"off"` to disable. */
  readonly ruleSeverity?: Readonly<Record<string, Severity | "off">>

  /** Map from rule id to per-rule options merged into the rule context. */
  readonly ruleOptions?: Readonly<Record<string, Readonly<Record<string, unknown>>>>

  /** Parsed prompt files to run rules against. */
  readonly files: readonly PromptFile[]
}

/**
 * Aggregated result of an engine run over a set of files. The CLI writes
 * this directly to the JSON reporter and the human reporter summarizes it.
 */
export interface EngineResult {
  readonly files: readonly PromptFile[]
  readonly findings: readonly Finding[]
  readonly stats: EngineStats
}

export interface EngineStats {
  readonly fileCount: number
  readonly ruleCount: number
  readonly durationMs: number
  readonly bySeverity: Readonly<Record<Severity, number>>
}

/**
 * Default rule-severity passthrough. The engine never mutates the user's
 * `RuleDefinition.defaultSeverity`; instead it overlays overrides at the
 * boundary.
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
 * declared default. This is a convenience helper for introspection.
 */
export function declaredOptions(rule: RuleDefinition): readonly RuleOption[] {
  return rule.options ?? []
}

// ---------------------------------------------------------------------------
// defineRule – factory that ensures interface compliance without extra deps
// ---------------------------------------------------------------------------

/**
 * Type-safe factory for creating a `RuleDefinition`. Returns a frozen
 * object so consumers cannot accidentally mutate rule definitions
 * at runtime.
 */
export function defineRule<TOptions = unknown>(
  def: RuleDefinition<TOptions>,
): RuleDefinition<TOptions> {
  return Object.freeze({ ...def })
}

// ---------------------------------------------------------------------------
// runEngine – the core execution pipeline
// ---------------------------------------------------------------------------

/**
 * Execute every enabled rule against every supplied file.
 *
 * Behaviour guarantees:
 * - Deterministic: findings are sorted by `ruleId`, then `fileId`.
 * - Error-isolating: a rule that throws produces a single `error` finding;
 *   other rules and other files are unaffected.
 * - Immutable: the returned `EngineResult` is deeply frozen.
 *
 * Concurrency is sequential by design in Phase 2 (one rule per file at a
 * time) to keep the engine simple and deterministic. The `concurrency`
 * option is reserved for a future phase.
 */
export async function runEngine(opts: EngineOptions): Promise<EngineResult> {
  const startedAt = performance.now()

  const activeRules = opts.rules.filter((rule) => {
    const sev = resolveSeverity(rule, opts.ruleSeverity)
    return sev !== null
  })

  const allFindings: Finding[] = []

  for (const rule of activeRules) {
    const resolvedSeverity = resolveSeverity(rule, opts.ruleSeverity) as Severity
    const ruleOpts = opts.ruleOptions?.[rule.id] ?? {}

    for (const file of opts.files) {
      const findings = await runOneRuleOneFile(rule, file, resolvedSeverity, ruleOpts)
      allFindings.push(...findings)
    }
  }

  // Deterministic sort
  allFindings.sort(byRuleThenFile)

  const endedAt = performance.now()
  const durationMs = Math.round(endedAt - startedAt)

  const bySeverity = tallySeverities(allFindings)
  const stats: EngineStats = Object.freeze({
    fileCount: opts.files.length,
    ruleCount: activeRules.length,
    durationMs,
    bySeverity,
  })

  return Object.freeze({
    files: opts.files,
    findings: Object.freeze(allFindings),
    stats,
  }) as EngineResult
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function runOneRuleOneFile(
  rule: RuleDefinition,
  file: PromptFile,
  severity: Severity,
  options: Readonly<Record<string, unknown>>,
): Promise<Finding[]> {
  const findings: Finding[] = []

  // Per-emission severity wins only when it deviates from the rule's declared
  // default; a finding that repeats the default severity lets the engine
  // apply the user-provided severity override (`ruleSeverity`) unaffected.
  const resolveSeverityFor = (raw: Omit<Finding, "ruleId" | "fileId" | "filePath">): Severity =>
    raw.severity !== undefined && raw.severity !== rule.defaultSeverity ? raw.severity : severity

  const report = (raw: Omit<Finding, "ruleId" | "fileId" | "filePath">): void => {
    findings.push(
      Object.freeze({
        ...raw,
        severity: resolveSeverityFor(raw),
        ruleId: rule.id,
        fileId: file.id,
        filePath: file.path,
      }),
    )
  }

  const context: RuleContext = Object.freeze({
    file,
    options,
    report,
  })

  try {
    const result = rule.check(context)
    const resolved = result instanceof Promise ? await result : result
    // Rules may return findings directly or call report; we merge both.
    // Deduplication: we collect from report() and from the return value,
    // then unique by identity.
    const returned = resolved.findings.map((f) =>
      Object.freeze({
        ...f,
        severity: resolveSeverityFor(f),
        ruleId: rule.id,
        fileId: file.id,
        filePath: file.path,
      }),
    )

    return dedupeFindings([...findings, ...returned])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return [
      Object.freeze({
        ruleId: rule.id,
        fileId: file.id,
        filePath: file.path,
        severity: "error" as Severity,
        message: `Rule "${rule.id}" threw an unhandled error: ${message}`,
      }),
    ]
  }
}

function byRuleThenFile(a: Finding, b: Finding): number {
  const ruleCmp = a.ruleId.localeCompare(b.ruleId)
  if (ruleCmp !== 0) return ruleCmp
  return a.fileId.localeCompare(b.fileId)
}

function tallySeverities(findings: readonly Finding[]): Readonly<Record<Severity, number>> {
  const tally: Record<Severity, number> = { info: 0, warning: 0, error: 0 }
  for (const f of findings) {
    tally[f.severity] = (tally[f.severity] ?? 0) + 1
  }
  return Object.freeze(tally)
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  return findings.filter((f) => {
    // Content-based key for deduplication
    const key = `${f.ruleId}|${f.fileId}|${f.message}|${f.severity}|${f.location?.line ?? ""}|${f.location?.column ?? ""}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Re-export the context type so consumers only need one import
export type { RuleContext }
