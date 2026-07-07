# Project Audit Log

This document tracks the architectural decisions, implementation milestones, and quality gate verifications for PromptLint.

## Phase 0: Project Scaffolding
- **Status**: Completed
- **Deliverables**:
    - Workspace structure: `apps/cli`, `apps/docs`, `examples/minimal`, `packages/*`.
    - Tooling: Husky, commitlint, lint-staged, turbo, biome.
    - Base TS configuration for `NodeNext` compatibility.
- **Verification**: Scaffolding verified via `pnpm build`.

## Phase 1: Prompt Parser Foundation
- **Status**: Completed
- **Deliverables**:
    - **YAML Parser**: Dependency-free subset parser for frontmatter extraction.
    - **Frontmatter Extractor**: Range-aware extraction with Zod validation for `PromptFrontmatter` shape.
    - **Variable Scanner**: Mustache-style `{{var}}` scanning with 1-indexed locations.
    - **Content Hasher**: Deterministic SHA-256 hashing of prompt identity and content.
    - **Markdown Parser**: Integration of frontmatter, variable scanning, and hashing for `.prompt.md`.
    - **Parser Dispatcher**: Format-aware dispatching logic.
- **Key Decisions**:
    - Avoided external YAML dependencies to keep the parser lightweight and deterministic.
    - Enforced deep freezing of all `ParseResult` structures to prevent downstream mutation.
    - Implemented `.js` extensions in imports to satisfy `NodeNext` module resolution.
- **Verification**:
    - All unit tests passed in `packages/parser`.
    - `pnpm verify` (format, lint, typecheck, test, build) passed for the entire workspace.

## Phase 2: Rule Engine Foundation
- **Status**: Completed
- **Timestamp**: 2026-07-07 02:18 +01:00
- **Objectives completed**:
    - Rule Engine public API (`runEngine`, `defineRule`, `resolveSeverity`, `declaredOptions`).
    - Rule execution pipeline (sequential rule × file dispatch).
    - Rule registration via the explicit `EngineOptions.rules` array.
    - Rule context (`RuleContext`) construction and freeze invariant.
    - Finding aggregation (merging `report()` emissions and return-value findings).
    - Severity handling (`ruleSeverity` overrides, per-emission escalation only when it deviates from `rule.defaultSeverity`).
    - Engine result model (`EngineResult`, `EngineStats` deeply frozen).
    - Error isolation (one failing rule produces a single `error` finding without stopping the engine).
    - Comprehensive unit tests (29 cases).
    - Documentation rewrite of `packages/rule-engine/README.md`.
- **Files added**:
    - None.
- **Files modified**:
    - `packages/rule-engine/src/index.ts`
    - `packages/rule-engine/src/index.test.ts`
    - `packages/rule-engine/README.md`
- **Files deleted**:
    - None.
- **Public APIs introduced**:
    - `runEngine(opts: EngineOptions): Promise<EngineResult>` — async dispatcher.
    - `defineRule<TOptions>(def: RuleDefinition<TOptions>): RuleDefinition<TOptions>` — factory that freezes the definition.
    - `resolveSeverity(rule: RuleDefinition, ruleSeverity?: Record<string, Severity | "off">): Severity | null` — overlay resolution (already exposed in Phase 0; backend retained).
    - `declaredOptions(rule: RuleDefinition): readonly RuleOption[]` — option introspector (already exposed in Phase 0; backend retained).
    - Re-export of the `RuleContext` type alias.
- **Architectural decisions**:
    - Concurrency is intentionally sequential in Phase 2 (`concurrency` option reserved for later). Determinism > throughput at this stage.
    - Findings sorted lexicographically by `ruleId` → `fileId` (stable across runs).
    - Findings are deeply frozen with `Object.freeze` on construction; `EngineResult` and `EngineStats` are frozen recursively.
    - Per-emission severity is interpreted as a deliberate escalation only when it differs from `rule.defaultSeverity`. This keeps the user-facing `ruleSeverity` override authoritative for findings that merely repeat the rule's own baseline severity.
    - Error isolation: `try/catch` around `rule.check`; throws become a single `error`-severity finding tagged with the rule id and the original message.
    - Deduplication: identical findings emitted via both `report()` and the return value are collapsed by `(ruleId, fileId, message, severity, location)` tuple.
- **Tests added**:
    - 29 unit tests in `packages/rule-engine/src/index.test.ts` covering: empty input, single & multi rule × file fan-out, default severity handling, `ruleSeverity` override, `"off"` disabling, per-emission severity escalation, error isolation for thrown/non-`Error` throws, `report()` callback mechanics, deduplication, async rule awaiting, deterministic sort, severity tally stats, rule option forwarding, deep-freeze invariants, rule context freeze, and async-style rule contexts.
- **Verification results**:
    - `pnpm format:check` — green (`Checked 98 files`).
    - `pnpm lint` — green (17 tasks successful).
    - `pnpm typecheck` — green (17 tasks successful).
    - `pnpm test:run` — green (all 17 tasks successful; 29/29 rule-engine tests pass).
    - `pnpm build` — green (14 tasks successful).
    - `pnpm verify` — green end-to-end.
- **Technical debt**:
    - The package's `clean` script uses `rm -rf` which is not portable to Windows; out of scope for Phase 2 but worth noting for future tooling work.
    - `concurrency` is exposed on `EngineOptions` but unused; Phase 3 may resolve this.
    - Deduplication key ignores `suggestions`; if two findings differ only in suggestion arrays they won't collapse. Acceptable for V1.
- **Known limitations**:
    - No concurrency yet: large fan-outs scale linearly with `rules × files`.
    - `failOn` is parsed from `EngineOptions` but the engine does not act on it; the CLI will own exit-code policy.
    - No structured logging or progress reporting. The engine surfaces rule failures only via finding emission.
- **Recommendation for Phase 3**:
    - Implement CLI integration, wire `runEngine` against `@promptlint/parser` + `@promptlint/config`, and resolve `failOn` into a real exit-code decision.
    - At that point, evaluate whether to introduce bounded concurrency (`p-limit` or a hand-rolled worker pool) without sacrificing determinism.
    - Begin populating `@promptlint/rules` with the V1 rules outlined in Phase 0.
