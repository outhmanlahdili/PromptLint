# `@promptlint/rules`

Catalog of the ten built-in V1 lint rules.

Phase 0 ships the immutable `RULES_MANIFEST` — the documented id,
category, description, severity, auto-fixability, and declared options
for each rule. The catalog is the single source of truth that the
docs site and the CLI `--list-rules` view render from.

Phase 2 implements each rule's `check` function, completing the
`RuleDefinition` and exposing them via `@promptlint/rules`. The
manifest entries are not modified during implementation; they are the
frozen contract that the rest of the system builds against.
