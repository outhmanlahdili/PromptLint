# @promptlint/config

Configuration loader for `.promptlintrc.json`.

Phase 0 ships the Zod schema (`promptlintConfigSchema`) and the
`DEFAULT_CONFIG` value. Phase 1 implements the file-system loader that
parses, validates, and resolves the configuration consumed by the engine.

The schema is intentionally restrictive (`.strict()`) so that an unknown
top-level key produces a clear validation error in Phase 1 rather than
silently misbehaving.
