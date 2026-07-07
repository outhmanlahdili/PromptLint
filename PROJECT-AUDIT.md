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

## Phase 3: Built-in Rules
- **Status**: Completed
- **Timestamp**: 2026-07-07 20:30 +01:00
- **Objectives completed**:
    - Implemented every rule declared in RULES_MANIFEST via defineRule() from @promptlint/rule-engine.
    - Reusable helpers extracted under packages/rules/src/helpers/ (regex utilities, variable inspection, filename normalization, token estimation, PII / instruction-override vocabulary, structured-data phrasing, vague-quantifier detection).
    - Public API: every rule exported by named export, plus getImplementedRules() whose order is locked by a runtime assertion against RULES_MANIFEST.
    - Comprehensive unit tests for every rule (111 tests in @promptlint/rules; entire workspace passes 230 tests).
    - Documentation: rewrote packages/rules/README.md and appended this entry.
- **Files added**:
    - packages/rules/src/helpers/{tokens,variables,filename,regex,pii,instruction-override,vague-quantifiers,structured-data,index}.ts.
    - packages/rules/src/generated/manifest.ts (extracted from the legacy bundled index).
    - packages/rules/src/structure/{missing-model,missing-description,unused-variable,undefined-variable}.ts.
    - packages/rules/src/cost/high-token-estimate.ts.
    - packages/rules/src/security/{pii-pattern,instruction-override-pattern}.ts.
    - packages/rules/src/quality/{missing-output-schema,vague-quantifier-language}.ts.
    - packages/rules/src/convention/filename-naming.ts.
    - One test file per rule under the corresponding category folder (10 files, 99 tests plus 12 manifest/API tests).
    - packages/rules/src/test-helpers.ts: shared makeContext / unRule harness used by every rule test.
- **Files modified**:
    - packages/rules/src/index.ts: now re-exports individual rules, adds getImplementedRules(), asserts the order against RULES_MANIFEST at module-load time.
    - packages/rules/src/index.test.ts: extended to cover the new public API and frozen-return contract.
    - packages/rules/package.json: declares the @promptlint/rule-engine, @promptlint/parser, and @promptlint/test-utils workspace deps needed by the new rule code and tests.
    - iome.json: ignored the workspace-local .opencode/ directory so the IDE/host tooling config files no longer flag the root ormat:check step.
    - packages/rules/README.md: rewritten to describe category layout, helper layer, public API, and authoring guide.
- **Public APIs introduced**:
    - getImplementedRules(): readonly RuleDefinition[] — the runtime list of every built-in rule in RULES_MANIFEST order, used to feed the engine.
    - Named rule exports: structureMissingModel, structureMissingDescription, structureUnusedVariable, structureUndefinedVariable, costHighTokenEstimate, securityPiiPattern, securityInstructionOverridePattern, qualityMissingOutputSchema, qualityVagueQuantifierLanguage, conventionFilenameNaming.
    - Helper exports: estimateTokens, collectBodyVariables, collectDeclaredVariables, indVariableOccurrences, isVariableMissing, extractPathBasename, isKebabCaseBasename, compileWordPattern, compileWordRegex, indAllMatches, locationForRange, PII_PATTERNS, detectPiiMatches, INSTRUCTION_OVERRIDE_PATTERNS, indInstructionOverrideMatches, VAGUE_QUANTIFIER_TERMS, indVagueQuantifierMatches, STRUCTURED_DATA_KEYWORDS, hasStructuredDataKeyword.
- **Architectural decisions**:
    - One file per rule, colocated with its tests under a category folder; helpers live in helpers/ so individual rule files stay small and auditable.
    - RULES_MANIFEST is the canonical source of order; ssertManifestOrder() runs at module load and throws if IMPLEMENTED_RULES ever drifts.
    - All rules declare a (possibly empty) options: Object.freeze([]) to keep the merge between manifest metadata and live definitions symmetric.
    - The cost/high-token-estimate rule is the only option-bearing rule in V1; its sole option maxTokens defaults to 2000 and the helper layer treats   or negative values as a disabled-rule signal.
    - Token estimation accounts for ASCII letters, Latin/Greek/Cyrillic blocks, and the CJK / Kana ranges — sufficient for the V1 budget hint without bundling a model tokenizer.
    - indAllMatches() clones the regex with the g flag unconditionally so call sites can supply non-global regexes without losing String.matchAll semantics.
    - Filename rule strips only known V1 extensions (prompt.md / prompt.ts / prompt.json plus the bare extensions) and emits a deterministic kebab-case transformation that handles camelCase, snake_case, and mixed punctuation.
- **Tests added**:
    - 99 rule-level tests under individual rule test files (valid + invalid prompts, empty bodies, unicode content, multiple findings, configurable options, malformed markdown where relevant).
    - 12 manifest / API tests in packages/rules/src/index.test.ts.
- **Verification results**:
    - pnpm format:check — green (128 files clean).
    - pnpm lint — green (20 tasks successful).
    - pnpm typecheck — green (20 tasks successful).
    - pnpm test:run — green across the workspace:
        - @promptlint/parser 69/69
        - @promptlint/rule-engine 29/29
        - @promptlint/rules 111/111
        - @promptlint/types 2/2
        - @promptlint/test-utils 4/4
        - @promptlint/reporter-json 4/4
        - @promptlint/reporter-human 5/5
        - @promptlint/config 7/7
    - pnpm build — green (14 tasks successful, all distributions emitted).
    - pnpm verify — green end-to-end.
- **Technical debt**:
    - pnpm-lock.yaml was regenerated to reflect the new workspace deps (@promptlint/parser, @promptlint/rule-engine, @promptlint/test-utils in packages/rules). No transitive drift outside that package.
    - Replacement of the legacy RuleManifestEntry export with a re-export from generated/manifest.ts keeps the public surface identical; downstream callers that imported the type by path continue to work because the re-export preserves the symbol.
- **Recommendation for Phase 4**:
    - Wire @promptlint/rules into the CLI; Phase 4 should now provide the loader that reads promptlint.config.* and resolves uleSeverity / uleOptions per rule before calling unEngine.
    - Evaluate bounded concurrency in the rule engine once the CLI integration is staged; determinism guarantees (uleId -> ileId lexicographic sort) still apply.
    - Begin adding config-level option schema validation now that rule options are declared.
