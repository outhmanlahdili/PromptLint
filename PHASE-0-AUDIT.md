# Phase 0 Audit

## Purpose

This document captures the current status and process for Phase 0 of the PromptLint project. It is intended to record what has been shipped in Phase 0, which contracts and artifacts are defined, and what remains to be implemented in later phases.

## Scope of Phase 0

Phase 0 establishes the foundational contracts for PromptLint V1 without implementing the full runtime behavior. The main goal is to define the public API surfaces, package contracts, data shapes, and metadata that later phases will implement.

### Phase 0 deliverables

- `@promptlint/types`
  - Shared type model for prompt files, findings, rules, rule options, and parser results.
  - Immutable data shapes for the public contract.

- `@promptlint/parser`
  - Parser input/output contracts (`RawPromptInput`, `ParseResult`, `ParseError`).
  - Parser interface (`PromptParser`).
  - Path normalization helper (`derivePromptId`).

- `@promptlint/rule-engine`
  - Engine input/output shapes (`EngineOptions`, `EngineResult`, `EngineStats`).
  - Severity override behavior helpers (`resolveSeverity`, `declaredOptions`).

- `@promptlint/rules`
  - Immutable `RULES_MANIFEST` catalog of the ten declared V1 rules.
  - Rule metadata only; `check` implementations are not part of Phase 0.

- `@promptlint/config`
  - Zod schema for `promptlint.config.json`.
  - Default configuration values.

- `@promptlint/reporter-human`
  - Pure formatter contract for rendering findings to text.
  - `SEVERITY_GLYPH` lookup.

- `@promptlint/reporter-json`
  - Deterministic JSON reporter contract, payload schema, and serializer.

- `@promptlint/test-utils`
  - Helper for building deterministic `PromptFile` test fixtures.

- **Scaffolding & Infrastructure**
  - Project documentation (`README`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `GOVERNANCE`, `LICENSE`, `SECURITY`).
  - Workspace scaffolding for `apps/cli`, `apps/docs`, and `examples/minimal`.
  - Tooling pipeline: Biome (lint/format), Vitest, Turbo, pnpm, Changesets.
  - Quality gates: Husky hooks for `pre-commit` (lint-staged) and `commit-msg` (commitlint).
  - Git configuration: `.gitattributes` forcing LF line endings.

## Repository structure

The workspace is organized as a monorepo with these package groups:

- `apps/` (cli, docs)
- `packages/` (config, parser, rule-engine, rules, reporter-human, reporter-json, test-utils, types)
- `tooling/` (supporting configs and tooling presets)
- `examples/` (minimal examples for tests/docs)

## Phase 0 process summary

1. Identify the V1 contract boundaries from the product requirements and PRD.
2. Define stable public types and interfaces in `@promptlint/types`.
3. Create package-level exports that expose Phase 0 artifacts without runtime implementations.
4. Write package README documentation that clearly describes what Phase 0 ships and what later phases will complete.
5. Add tests that verify the contract behavior and metadata consistency.
6. Keep Phase 0 artifacts intentionally narrow: no I/O, no rule implementations, no CLI wiring, and no parser conversions.
7. Establish a robust CI/CD and local verification pipeline (`pnpm verify`).

## Current status

- Phase 0 contracts exist for all core packages.
- Workspace scaffolding and root-level project documentation are complete.
- Tooling infrastructure (Husky, lint-staged, commitlint) is wired and operational.
- `pnpm format` and `pnpm lint` are green across the entire workspace.
- No implementation of parser formats, rule execution, or CLI orchestration is included.
- Package readmes document Phase 0 deliverables and phase boundaries.
- Test coverage focuses on contract validation and manifest stability.
- **Note:** Pre-existing type-check errors in core packages (due to `rootDir: ".."` and duplicate exports) are acknowledged and deferred to Phase 1.

## Notes for next phases

- Phase 1 should implement runtime behavior for parser registration, config loading, and engine dispatch.
- Phase 2 should implement reporter rendering, rule checks, and full CLI integration.
- Future work should preserve Phase 0 contracts as a stable foundation.

## Recommended follow-up

- Add a root-level `README` summary section linking to this audit file.
- Capture any specific Phase 0 decisions or open questions in this document as the phase evolves.
- Maintain this file as the canonical Phase 0 status artifact.
