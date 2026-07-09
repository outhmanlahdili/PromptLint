# @prompt-lint/rule-engine

Rule engine for PromptLint V1.

## Purpose

The engine is the seam between **parsed prompt files** (`@prompt-lint/parser`)
and **lint rules** (`@prompt-lint/rules`). It owns:

- Rule registration (via the `EngineOptions.rules` array).
- Rule execution: fan-out across files, awaiting async rule checks.
- Rule context construction (per-rule options + read-only file view).
- Finding aggregation: merging `report()` emissions and return-value findings.
- Severity handling: layered override of `rule.defaultSeverity`.
- Error isolation: a single failing rule produces a single `error` finding
  without aborting the run.
- Deterministic ordering: findings sorted by `ruleId`, then `fileId`.

The engine performs no I/O. Inputs are already–parsed `PromptFile`
instances.

## Public API

```ts
import {
  runEngine,        // core dispatcher
  defineRule,       // factory that freezes a RuleDefinition
  resolveSeverity,  // apply ruleSeverity overrides
  declaredOptions,  // introspect a rule's declared RuleOption list
} from "@prompt-lint/rule-engine"
```

### `EngineOptions`

| Field           | Type                                                | Description                                          |
| --------------- | --------------------------------------------------- | ---------------------------------------------------- |
| `files`         | `readonly PromptFile[]`                             | Parsed files to lint.                                |
| `rules`         | `readonly RuleDefinition[]`                         | Active rules.                                             |
| `ruleSeverity?` | `Readonly<Record<string, Severity \| "off">>`       | Per-rule severity override or `"off"` to disable.     |
| `ruleOptions?`  | `Readonly<Record<string, Readonly<Record<string,unknown>>>>` | Per-rule option overrides merged into context. |
| `concurrency?`  | `number`                                            | Reserved; not used in Phase 2 (sequential execution). |
| `failOn?`       | `Severity`                                          | Reserved for the CLI's exit-code policy.             |

### `EngineResult`

```ts
interface EngineResult {
  readonly files:    readonly PromptFile[]
  readonly findings: readonly Finding[]
  readonly stats:    EngineStats
}

interface EngineStats {
  readonly fileCount:    number
  readonly ruleCount:    number
  readonly durationMs:   number
  readonly bySeverity:   Readonly<Record<Severity, number>>
}
```

All fields are deeply frozen; downstream consumers cannot mutate the
result.

### Severity resolution

```
user override  (ruleSeverity[rule.id])
        |
        v
rule.declared default  (rule.defaultSeverity)
        |
        v
per-finding severity    (only when it differs from rule.defaultSeverity)
```

- The engine computes a `resolvedSeverity` once per rule from
  `resolveSeverity()`. Disabled rules (`"off"`) are skipped entirely.
- For each emitted finding, the engine substitutes the rule's
  resolved severity by default. A finding's per-emission severity
  intentionally escalates/de-escalates a specific finding **only when
  it differs from `rule.defaultSeverity`**, so the user override
  always wins for findings that mirror the rule's normal baseline.
- A rule that throws surfaces an `error` finding tagged with the rule
  id and the original message.

### Determinism

- Files and rules are iterated in insertion order.
- Findings are sorted lexicographically by `ruleId` then `fileId`
  before being returned, regardless of insertion order.
- Results are deeply frozen: any downstream mutation throws in strict
  mode and is silently ignored otherwise.

## Phase status

| Phase | Status | Notes                                          |
| ----- | ------ | ---------------------------------------------- |
| 0     | done   | Shapes + helpers (`resolveSeverity`, …).       |
| 2     | done   | Dispatcher, context, error isolation, dedupe.  |
| 3     | —      | CLI wiring and concurrency model.              |

## Testing

The engine is unit-tested with synthetic `PromptFile` fixtures and
in-memory rules. Coverage focuses on:

- Severity resolution (default, override, per-emission, "off").
- `report()` callback mechanics.
- Async / sync rule execution.
- Error isolation (single rule failure does not stop the engine).
- Deduplication of equivalent findings emitted via both paths.
- Sort stability and freeze guarantees on the result graph.
