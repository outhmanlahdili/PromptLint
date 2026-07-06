# @promptlint/minimal-example

A minimal PromptLint project used by tests and documentation.

## Layout

- `.promptlintrc.json` — example configuration enabling every V1 rule
  at a representative severity.
- `hello.prompt.md` — a tiny prompt file with frontmatter and one
  variable, used as a fixture for engine/roundtrip tests.

This example is intentionally tiny. It exists so the smoke-tests in
later phases can run against a real `.promptlintrc.json` without
depending on a developer's local checkout.
