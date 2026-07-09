# @prompt-lint/types

Foundational TypeScript types for PromptLint V1.

This package is the single source of truth for the cross-package contract
that the engine, parser, rules, and reporters build against. It contains
no runtime logic — only types and a single frozen lookup table
(`SEVERITY_WEIGHT`) used by the future rule engine.

The shape of every interface here is part of the stable public V1 API
within the workspace; Phase 1 will publish it under a `@prompt-lint/types`
package name and freeze it as a semver-stable surface.
