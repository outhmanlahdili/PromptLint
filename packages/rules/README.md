# `@promptlint/rules`

Built-in lint rules for PromptLint V1.

This package ships the complete V1 catalog of rules declared in
`RULES_MANIFEST`. Each rule lives in its own file under `src/`,
grouped into one subdirectory per category:

- `structure/` – `missing-model`, `missing-description`,
  `unused-variable`, `undefined-variable`.
- `cost/` – `high-token-estimate`.
- `security/` – `pii-pattern`, `instruction-override-pattern`.
- `quality/` – `missing-output-schema`, `vague-quantifier-language`.
- `convention/` – `filename-naming`.

A shared `helpers/` directory hosts the pure utility layer used by the
rules: regex construction, variable inspection, token estimation,
filename normalization, PII / instruction-override vocabulary,
structured-data phrasing, and vague-quantifier detection.

## Public API

```ts
import {
  RULES_MANIFEST,
  definedRuleIds,
  findManifestEntry,
  getImplementedRules,
  // Individual rule definitions are also re-exported by id-prefixed name.
  structureMissingModel,
  costHighTokenEstimate,
} from "@promptlint/rules"

// Returns every implemented rule in the order defined by RULES_MANIFEST.
const rules = getImplementedRules()

// Look up manifest metadata by id.
const entry = findManifestEntry("quality/missing-output-schema")

// Hand the rules to the engine.
const result = await runEngine({ rules, files })
```

`RULES_MANIFEST` is the immutable source of truth: the catalog order is
locked and the `assertManifestOrder` runtime guard in `src/index.ts`
fails noisily if `getImplementedRules()` ever drifts apart from it.

## Writing a new rule

1. Place the implementation in the appropriate category subdirectory.
2. Use `defineRule` from `@promptlint/rule-engine`.
3. Consume the `RuleContext` (`file`, `options`, `report`).
4. Emit deterministic findings; the engine handles dedup and ordering.
5. Declare options via the `options:` array when the rule accepts
   configuration.
6. Re-export the rule from `src/index.ts` (both as a named export and as
   part of `getImplementedRules()`).
7. Cover the rule with unit tests colocated in the same directory.
8. Update `RULES_MANIFEST` in `src/generated/manifest.ts` and add a
   matching phase entry to `PROJECT-AUDIT.md`.

## Tests

```bash
pnpm --filter @promptlint/rules test:run
```

Every rule runs against the same harness — `src/test-helpers.ts` —
which auto-extracts `{{ variable }}` references from the body. Tests
cover valid prompts, invalid prompts, empty bodies, unicode content,
multiple findings, filename edge cases, configurable options, and
malformed markdown where relevant.
