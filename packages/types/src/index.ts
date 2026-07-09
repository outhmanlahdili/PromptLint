/**
 * Severity of a {@link Finding} emitted by a lint rule.
 *
 * Ordered from least to most severe so that callers can compare severities
 * numerically when summarizing a run.
 *
 * - `info`:    low-signal stylistic note; never fails a build.
 * - `warning`: likely problem worth reviewing; does not fail a build by default.
 * - `error`:   definite problem; fails a build unless explicitly suppressed.
 */
export type Severity = "info" | "warning" | "error"

/**
 * Numeric weight for each severity. Higher = more severe.
 *
 * @example
 * const max = Math.max(...findings.map((f) => SEVERITY_WEIGHT[f.severity]));
 */
export const SEVERITY_WEIGHT: Readonly<Record<Severity, number>> = Object.freeze({
  info: 0,
  warning: 1,
  error: 2,
})

/**
 * Supported prompt file formats. V1 handles the three formats documented in
 * the PRD; additional formats are added in V2 without breaking changes to
 * this enum.
 */
export type PromptFormat = "prompt.md" | "prompt.ts" | "prompt.json"

export interface VariableOccurrence {
  readonly name: string
  readonly location: SourceLocation
}

/**
 * A variable referenced inside a prompt body, as inferred by the parser.
 *
 * `name` is the identifier as written in source. `locations` lists every
 * source position where the variable is referenced, requested in 1-indexed
 * line/column form for editor integration.
 */
export interface PromptVariable {
  readonly name: string
  readonly locations: readonly SourceLocation[]
}

/**
 * A 1-indexed source range inside a file. Endpoints are inclusive on the
 * start side and exclusive on the end side, matching LSP conventions.
 */
export interface SourceLocation {
  readonly line: 1 | number
  readonly column: 1 | number
  readonly endLine: number
  readonly endColumn: number
}

/**
 * Structured prompt metadata extracted from frontmatter (`.prompt.md` /
 * `.prompt.json`) or document header comments. All fields are optional
 * because V1 rules do not assume a specific frontmatter shape.
 */
export interface PromptFrontmatter {
  readonly description?: string
  readonly model?: string
  readonly variables?: readonly string[]
  readonly outputSchema?: Readonly<Record<string, unknown>>
  /** Catch-all for known-in-V2 keys. The core engine never inspects these. */
  readonly extra?: Readonly<Record<string, unknown>>
}

/**
 * The normalized representation of a parsed prompt file handed to rules.
 *
 * Rules MUST treat `PromptFile` as immutable. Rules MUST NOT read raw files;
 * the engine loads and parses files before invoking any rule.
 */
export interface PromptFile {
  /** Stable identifier derived from `path`; suitable for use as a cache key. */
  readonly id: string
  /** Repository-relative path, using forward slashes. */
  readonly path: string
  readonly format: PromptFormat
  /** Raw body of the prompt as the user would send to a model. */
  readonly body: string
  readonly frontmatter: PromptFrontmatter
  readonly variables: readonly PromptVariable[]
  /** SHA-256 of normalized content, used for caching in later phases. */
  readonly contentHash: string
}

/**
 * A single finding produced by a rule. Findings describe a problem with
 * sufficient context that a developer can locate and fix it without
 * reading the rule source.
 *
 * - `message` should be one short imperative sentence.
 * - `suggestions` are actionable, optional, and ordered by expected impact.
 */
export interface Finding {
  readonly ruleId: string
  readonly fileId: string
  readonly filePath: string
  readonly severity: Severity
  readonly message: string
  readonly location?: SourceLocation
  readonly suggestions?: readonly string[]
}

/**
 * Aggregate result of a single rule run over a single prompt file.
 *
 * The dispatcher accepts either a `Promise<RuleResult>` (rules are awaited
 * per-file) or a synchronous `RuleResult`. Rules SHOULD be async so the
 * engine can budget concurrency uniformly.
 */
export interface RuleResult {
  readonly findings: readonly Finding[]
}

/**
 * Per-file execution context provided to every rule.
 *
 * Rules MUST consume only the read-only members of this object. Writing to
 * or replacing `file`, `report`, or any other property is undefined
 * behavior and may be detected by the engine in future versions.
 */
export interface RuleContext {
  /** Parsed prompt file under inspection. */
  readonly file: PromptFile
  /** Rule options as resolved from configuration. */
  readonly options: Readonly<Record<string, unknown>>
  /** Sink for emitting findings. */
  readonly report: (finding: Omit<Finding, "ruleId" | "fileId" | "filePath">) => void
}

/**
 * A lint rule definition. V1 rules are pure functions of a {@link RuleContext};
 * they do not perform I/O and must not require a network connection.
 *
 * Implementations live in `@prompt-lint/rules` (V1) and return a `RuleDefinition`
 * via the `defineRule` factory exported from `@prompt-lint/rule-engine` in
 * Phase 1. The shape below is part of the stable public contract from V1.
 */
export interface RuleDefinition<_TOptions = unknown> {
  /** Stable, namespaced id, e.g. `"quality/missing-output-schema"`. */
  readonly id: string
  /** Human-readable description shown in documentation and `--help`. */
  readonly description: string
  /** Severity applied when the rule fires without explicit overrides. */
  readonly defaultSeverity: Severity
  /** Optional, ordered list of every public option the rule reads. */
  readonly options?: readonly RuleOption[]
  /**
   * Rule implementation. Returns a finding list. Errors thrown here are
   * surfaced by the engine as a single `error` finding with the rule id;
   * the rule name is included to give the developer a starting point.
   */
  readonly check: (context: RuleContext) => RuleResult | Promise<RuleResult>
  /**
   * Optional JSON-Schema-like description of option shapes. Phase 0 reserves
   * the field; Phase 1 ships the validator.
   */
  readonly schema?: Readonly<Record<string, unknown>>
}

/** A single tunable option exposed by a rule. */
export interface RuleOption {
  readonly name: string
  readonly type: "string" | "number" | "boolean" | "string[]"
  readonly default: string | number | boolean | readonly string[]
  readonly description: string
}
