# Comprehensive PromptLint Example

This example demonstrates PromptLint running against a realistic codebase with multiple files triggering every single built-in rule.

## Structure

- `promptlint.config.json` — Custom PromptLint configuration setting strict severities and a low token threshold (`maxTokens: 50`).
- `clean.prompt.md` — Passes all 10 rules successfully.
- `invalid-structure.prompt.md` — Triggers `structure/missing-model`, `structure/missing-description`, `structure/unused-variable`, and `structure/undefined-variable`.
- `invalid-security.prompt.md` — Triggers `security/pii-pattern`, `security/instruction-override-pattern`, and `cost/high-token-estimate`.
- `invalid-quality.prompt.md` — Triggers `quality/missing-output-schema` and `quality/vague-quantifier-language`.
- `invalid_convention.prompt.md` — Triggers `convention/filename-naming` due to snake_case naming.

## How to Run

From the repository root directory:

```bash
# Scan the comprehensive example directory
pnpm promptlint check examples/comprehensive
```

This will run PromptLint using the `promptlint.config.json` file inside this directory and print a full, beautiful diagnostic report of all findings.
