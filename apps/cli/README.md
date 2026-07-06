# @promptlint/cli

PromptLint command-line interface.

## Phase 0 status

Empty scaffold. The CLI is intentionally not implemented in Phase 0.
Phase 2 will introduce the argument parser, configuration loading,
rule dispatch, and reporter selection wired to `apps/cli`.

Until then this package exposes no public surface and ships a no-op
`build` script. Linting, type-checking, and tests run against a single
placeholder fixture so the workspace verification pipeline stays green.
