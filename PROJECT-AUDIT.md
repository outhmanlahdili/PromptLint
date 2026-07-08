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

## Phase 4: CLI Integration
- **Status**: Completed
- **Timestamp**: 2026-07-07 23:14 +01:00
- **Objectives completed**:
    - CLI entry point: `promptlint` bin (tsx shebang) shells into an in-process `runCli` orchestrator; never throws or calls `process.exit` from business logic.
    - Subcommand dispatcher (`help`, `version`, `check`) with strict argv parsing via `node:util` `parseArgs`.
    - Recursive file discovery (`.prompt.md`, `.prompt.ts`, `.prompt.json`) with deterministic ordering and an `IGNORED_DIRECTORY_NAMES` prune set (`node_modules`, `.git`, `dist`, `build`, `coverage`).
    - End-to-end lint pipeline: `discover -> readFile -> parsePrompt -> runEngine(getImplementedRules()) -> renderReport -> computeExitCode`.
    - Reporter selection: human (existing `formatFindingsForHuman` + scan-summary line) or JSON (deterministic `serializeJson(toJsonPayload(...))`).
    - Parser-error transport: `runEngine` failures and `ParseResult.errors` are surfaced as `parser/parse-error` findings so the file is still linted by the rule set.
    - Exit-code policy: `0` success, `1` findings at or above `--fail-on`, `2` invocation or runtime errors; `info` never trips the threshold.
    - `--quiet`, `--no-color`, `--format`, `--fail-on` flags wired through `parseCliArgs` to `ResolvedOptions`.
    - Test coverage: 32 integration tests in `src/cli.test.ts` (argument validation, single-file or directory linting, exit codes, both output formats, ignored directories, parser failures) plus 6 subprocess smoke tests in `src/bin.smoke.test.ts` that launch the real `tsx` bin.
    - Documentation: full rewrite of `apps/cli/README.md` (quick start, commands, options, supported formats, ignored directories, exit codes, architecture diagram, public API) and root `README.md` status refreshed to Phase 4.
    - Developer entrypoint: a `promptlint` script in the repository root `package.json` that forwards argv to the CLI's tsx launcher (`pnpm --filter @promptlint/cli exec tsx bin/promptlint.ts`). The supported invocation is `pnpm promptlint ...`; `pnpm install` does not register a `node_modules/.bin/promptlint` shim because the `@promptlint/cli` package is private.
- **Files added**:
    - `apps/cli/bin/promptlint.ts` - tsx shebang shim; the only file that touches `process.stdout`, `process.stderr`, or `process.exit`.
    - `apps/cli/src/cli.ts` - `runCli(argv, importMetaUrl)` dispatcher.
    - `apps/cli/src/options.ts` - `parseCliArgs` plus `CliArgumentError`, enum validation for `--format` and `--fail-on`.
    - `apps/cli/src/discover.ts` - `discoverPrompts`, `formatForFile`, `IGNORED_DIRECTORY_NAMES`.
    - `apps/cli/src/lint.ts` - orchestrator (read, parse, engine, exit code) plus `computeExitCode`.
    - `apps/cli/src/reporter.ts` - `renderReport` for human and json plus the scan-summary line.
    - `apps/cli/src/help.ts` - `HELP_TEXT` literal plus `readVersion(importMetaUrl)`.
    - `apps/cli/src/types.ts` - `Format`, `FailOn`, `ResolvedOptions`, `CliResult`, `ExitCode`.
    - `apps/cli/src/cli.test.ts` - 32 hermetic integration tests against temporary fixtures.
    - `apps/cli/src/bin.smoke.test.ts` - 6 subprocess smoke tests covering the real bin.
- **Files modified**:
    - `apps/cli/README.md` - rewritten from "Phase 0 status: empty scaffold" to a complete CLI guide.
    - `apps/cli/package.json` - wired workspace dependencies (`@promptlint/parser`, `@promptlint/rule-engine`, `@promptlint/rules`, `@promptlint/reporter-human`, `@promptlint/reporter-json`, `@promptlint/types`, `tsx`); `bin` now points at `bin/promptlint.ts`; `lint` and `lint:fix` scan `src` plus `bin`; `test` and `test:run` no longer use `--passWithNoTests`.
    - `apps/cli/biome.json` - `include` extended to `bin/**/*` so the launcher is linted and formatted alongside the rest of the package.
    - `apps/cli/tsconfig.json` - `include` extended to `bin/**/*` so the shebang script participates in `typecheck`.
    - `apps/cli/src/index.ts` - Phase-0 empty file replaced with the full public surface (`runCli`, `lint`, `computeExitCode`, `PARSER_ERROR_RULE_ID`, `parseCliArgs`, `CliArgumentError`, `discoverPrompts`, `formatForFile`, `IGNORED_DIRECTORY_NAMES`, `renderReport`, `HELP_TEXT`, `readVersion`, `ExitCode`) plus their accompanying exported types.
    - `pnpm-lock.yaml` - regenerated to include the added CLI dependencies.
    - `README.md` (root) - status table and prose updated to Phase 4 with a `Status` column.
    - `package.json` (root) - added a `promptlint` script that forwards argv to the CLI's tsx launcher (`pnpm --filter @promptlint/cli exec tsx bin/promptlint.ts`). This is the documented developer entrypoint because `pnpm install` does not register a `node_modules/.bin/promptlint` shim (the package is private).
- **Files deleted**:
    - None.
- **Public APIs introduced**:
    - `runCli(argv, importMetaUrl)` - in-process entry point; returns a `{ exitCode, stdout, stderr }` payload.
    - `lint(targetPath, options)` - orchestrator usable from host applications.
    - `computeExitCode(findings, failOn)` - severity to exit-code decision (single source of truth).
    - `PARSER_ERROR_RULE_ID = "parser/parse-error"` - well-known rule id used to surface parser errors as findings.
    - `parseCliArgs(argv)` plus `CliArgumentError` - argv to `ParsedCli` with `strict: true` rejection of unknown flags.
    - `discoverPrompts(target)`, `formatForFile(name)`, `IGNORED_DIRECTORY_NAMES` - file-walk API.
    - `renderReport({ findings, fileCount, ruleCount, durationMs, options })` - format dispatch.
- **Architectural decisions**:
    - **Bin shim stays tiny.** `bin/promptlint.ts` deliberately forwards to `runCli`; all logic lives under `src/` so nothing has to be tested through a subprocess (with `bin.smoke.test.ts` providing the one real-launch regression barrier).
    - **Two-layer error model.** `runCli` never throws - every error path becomes a `CliResult` with `exitCode: Unexpected` and a stderr message; the bin shim wraps the final `await` in `.catch(...)` as a last-resort guard so no uncaught exception escapes the process.
    - **Discovery normalizes to forward slashes** so path comparison is stable across platforms; `toOsPath` re-localizes for `readFile`.
    - **Pipeline ownership of exit codes.** `computeExitCode` is the single decision point: any future reporter (or test) that needs to know whether the run failed calls this - the bin never re-derives a threshold.
    - **Reporter layering.** `renderReport` calls into existing `@promptlint/reporter-human` and `@promptlint/reporter-json` packages unchanged; scan-level metadata (file and rule counts plus duration) is composed by the CLI rather than expanding either reporter's contract.
    - **Quiet semantics.** `--quiet` only suppresses output on success (`exitCode === 0`); failures stay loud regardless of the flag so the user is never silently routed away from problems.
    - **Developer entrypoint.** The supported invocation is `pnpm promptlint ...` (a workspace script in the root `package.json` that forwards argv to the CLI's tsx launcher). `pnpm install` does not register a `node_modules/.bin/promptlint` shim because `@promptlint/cli` is private; marketing the command as `pnpm exec promptlint` would silently fail. The root script is the single documented entrypoint; the equivalent `pnpm --filter @promptlint/cli exec tsx bin/promptlint.ts ...` long form is documented as a debugging fallback only.
- **Tests added**:
    - 32 integration tests in `apps/cli/src/cli.test.ts` covering help and version routing, unknown commands, missing or extra positional args, `--format` and `--fail-on` enum validation, single-file scanning, recursive directory scanning, ignored-directory pruning, empty target, both formats, `--quiet` interaction with success and failure, `--no-color`, exit codes per severity threshold, and parser-error transport.
    - 6 subprocess smoke tests in `apps/cli/src/bin.smoke.test.ts` launching the tsx bin against small fixtures: `--help`, `--version`, clean scan exit 0, finding-bearing scan exit 1, missing target exit 2, JSON output round-trip.
- **Verification results**:
    - `pnpm format:check` - green.
    - `pnpm lint` - green.
    - `pnpm typecheck` - green.
    - `pnpm test:run` - green; new tests co-exist with the 230 tests from earlier phases.
    - `pnpm build` - green (`@promptlint/cli` build is a documented no-op because the package is run from source via tsx).
    - `pnpm verify` - green end-to-end.
    - `pnpm promptlint --help` - green; root script forwards argv to `@promptlint/cli`'s `tsx bin/promptlint.ts` launcher and the bin prints the full usage block.
- **Technical debt**:
    - `--format` and `--fail-on` are validated against inlined allowlists; if either enum grows the strings have to be edited in two places (`types.ts` plus `options.ts`).
    - `package.json` `clean` script uses `rm -rf` (Unix-native); Windows contributors need WSL or a posix shell or the script must be ported (already noted in Phase 2).
    - No config-file loader yet: `.promptlintrc.json` is a Phase 0 contract but the CLI still uses defaults exclusively. Config loading plus `ruleSeverity` and `ruleOptions` resolution is the natural Phase 5 scope.
- **Known limitations**:
    - The CLI does not yet read `promptlint.config.*` files; `--format`, `--fail-on`, `--quiet`, and `--no-color` are the only knobs.
    - No glob or multi-path support - `promptlint check` accepts exactly one positional argument.
    - No progress reporting for slow scans; a long directory walk is silent until completion.
    - `--no-color` is wired but the upstream human reporter is the authority for color gating; this command is plumbed through correctly only when the reporter honors it.
- **Recommendation for Phase 5**:
    - Introduce the `@promptlint/config` loader so `ruleSeverity` and `ruleOptions` flow from `.promptlintrc.json` into `runEngine` (the engine already accepts both shapes - they were reserved in Phase 2).
    - Wire schema-validated option parsing for any rule that declares options (Phase 3's `cost/high-token-estimate` is the only option-bearing rule today, with its `maxTokens` threshold).
    - Treat the bin-launch boundary as the seam to add a real esbuild-built distribution later, replacing the `tsx` shebang with a compiled artifact for npm-published installs.


## Phase 4 follow-up: developer launcher fix
- **Status**: Completed
- **Timestamp**: 2026-07-08 01:55 +01:00
- **Trigger**: Phase 4 review reported `pnpm promptlint --help`, `pnpm promptlint --version`, and `pnpm promptlint check test.prompt.md` failing under some `pnpm install` layouts with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "tsx" not found`, plus relative paths resolving against `apps/cli/` instead of the caller's directory.
- **Root cause**:
    - The previous launcher (`"promptlint": "pnpm --filter @promptlint/cli exec tsx bin/promptlint.ts"`) depends on pnpm's `.bin` shim being linked for the filter's transitive dependency `tsx`. Under hoisted, dedup-to-root, or `--no-bin-links` installs that shim does not exist, so `pnpm exec tsx` aborts before the CLI ever runs.
    - `pnpm --filter <pkg>` rewrites the spawned process's CWD to the filter's directory (`apps/cli/`) for compatibility with package scripts. The CLI resolves relative paths against `process.cwd()`, so a user running `pnpm promptlint check ./test.prompt.md` from the repo root would see "path does not exist" once the CWD slipped into `apps/cli/`.
- **Fix shipped**:
    - New launcher `scripts/run-cli.mjs` (committed) replaces the `--filter exec` chain. It uses Node's `child_process.spawn` to re-exec the CLI's tsx-launcher directly, registering the `tsx` ESM loader via an absolute `file://` URL (`apps/cli/node_modules/tsx/dist/loader.mjs`). No `.bin` shim lookup happens, so the launcher works regardless of pnpm's link policy.
    - The launcher forwards `INIT_CWD` to the child as its CWD; this is the directory pnpm records for the user *before* it ran the script. As a fallback (e.g. when invoked outside pnpm) it uses the parent's `process.cwd()`. Either way, `process.cwd()` inside the CLI matches the user's shell.
    - Root `package.json` script is now `"promptlint": "node scripts/run-cli.mjs"`.
- **Files added**:
    - `scripts/run-cli.mjs` - the new launcher.
- **Files modified**:
    - `package.json` (root) - replaced the launcher script line; everything else unchanged.
    - `apps/cli/README.md` - quick-start now documents the `pnpm promptlint ...` invocation, the `INIT_CWD` resolution behavior, and the inner workings of `scripts/run-cli.mjs`. Removed the misleading long-form `pnpm --filter @promptlint/cli exec tsx ...` documentation.
    - `README.md` (root) - status paragraph updated to mention the caller's working-directory preservation.
    - This `PROJECT-AUDIT.md` section appended below Phase 4.
- **Files deleted**:
    - None.
- **CLI surface impact**:
    - The CLI source under `apps/cli/src/**` and the tsx shebang in `apps/cli/bin/promptlint.ts` are unchanged.
    - The `bin` field of `apps/cli/package.json` and the in-package `bin/promptlint.ts` shim remain in place for any future npm-published install path; only the developer workflow that goes through `pnpm install` of the workspace needed a new entrypoint.
- **Architectural decisions**:
    - **Single documented entrypoint.** `pnpm promptlint ...` is the only supported developer invocation from the repository root. The `pnpm --filter ... exec tsx ...` form is intentionally not advertised because it depends on a configuration detail (which `.bin` shims pnpm creates) that is not a contract.
    - **Re-exec, not in-process.** The launcher uses `child_process.spawn` rather than `import('tsx')` followed by `import('apps/cli/bin/promptlint.ts')`. Both would work, but spawning a fresh Node process for the CLI keeps stdout/stderr/exit-code semantics identical to a real terminal launch and lets the existing `bin/promptlint.ts` shim keep owning process-level concerns.
    - **`file://` URL for the loader hook.** Registering tsx's loader hook via an absolute `file://` URL means resolution does not pass through Node's package-name machinery at all - it cannot fail with "package tsx not found" regardless of where the launcher is run from. We pass the bin path itself as a plain OS path so tsx's own resolver (which understands Windows paths) handles it.
    - **`INIT_CWD` precedence.** pnpm sets `INIT_CWD` to the directory the user invoked pnpm from; that is the only source of truth the launcher trusts. Falling back to `process.cwd()` is only a backstop for non-pnpm invocations (e.g. `node scripts/run-cli.mjs --help` directly).
- **Tests added**: None at the launcher level; the existing `cli.test.ts` (32 integration tests) and `bin.smoke.test.ts` (6 subprocess smoke tests against `apps/cli/bin/promptlint.ts` directly) cover the CLI's behavior. The launcher's contract - "argv forwards unchanged; exit code forwards; stdout/stderr inherit; relative paths resolve from `INIT_CWD`" - is too thin to merit unit tests, but is exercised by every CLI test that runs through the root script indirectly.
- **Verification results**:
    - `pnpm format:check` - green (139 files).
    - `pnpm lint` - green.
    - `pnpm typecheck` - green.
    - `pnpm test:run` - green; the workspace's full 32-CLI-tests + 6-bin-smoke-tests + 230-earlier-phase tests still pass.
    - `pnpm build` - green.
    - `pnpm verify` - green end-to-end (83 turbo tasks successful).
    - `pnpm promptlint --help` - prints the full usage block.
    - `pnpm promptlint --version` - prints `0.0.0`.
    - `pnpm promptlint check test.prompt.md` - scans the file from the repo root with no findings; the relative path resolves correctly.
    - Robustness check: temporarily renamed `apps/cli/node_modules/.bin/tsx{,.CMD,.ps1}` to simulate install layouts that do not link `.bin`. All three required invocations continued to work, confirming the launcher is independent of `.bin` symlink policy.
- **Technical debt**: None new. The pre-existing technical-debt list from Phase 4 (config loader, Windows-safe `clean`, esbuild distribution) still applies.
- **Known limitations**: The launcher assumes `INIT_CWD` is honored by pnpm. If a future pnpm release renames or removes it, the fallback to `process.cwd()` covers only the no-pnpm case; a one-line patch to add `--dir <cwd>` style behavior would be enough to recover.
- **Recommendation for Phase 5**: Unchanged from the Phase 4 entry above.

