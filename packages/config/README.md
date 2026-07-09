# @prompt-lint/config

Configuration loader for `promptlint.config.{ts,json}`.

PromptLint reads configuration from a single file per directory tree
(`promptlint.config.ts` first, then `promptlint.config.json`), walking
upward from the caller's working directory until one is found or the
filesystem root is reached. This package owns the loading, validation,
and resolution of that file; the CLI consumes the resolved shape via
`loadConfig` and never re-implements any of this logic.

## Phase 5 status — complete

Phase 5 ships the loader, Zod schema, defaults, merging, ignore-glob
matcher, and rule resolver. Configuration is the single source of truth
for:

- `failOn` (severity threshold) and `format` output, unless overridden
  by an `--fail-on` / `--format` flag on the command line.
- `ignore` patterns applied during file discovery.
- `rules` block: per-rule severity overrides and per-rule options,
  resolved against the rule manifest consumed by the engine.

## Quick start

```ts
import { loadConfig } from "@prompt-lint/config"

const { config, filePath } = await loadConfig(process.cwd())
console.log(config.failOn, config.format, config.ignore, config.rules)
console.log("loaded from:", filePath)
```

Resolution order (the lookup happens in this exact order):

1. `<cwd>/promptlint.config.ts` → if present, parse and validate.
2. `<cwd>/promptlint.config.json` → if no `.ts` was found, parse and validate.
3. The parent directory, then its parent, and so on, until the
   filesystem root.
4. If no file exists anywhere on the path, `loadConfig` returns
   `DEFAULT_CONFIG` with `filePath === null`.

The resolved config is **always** the full `PromptlintConfig` shape
(`failOn`, `format`, `ignore`, `rules` are guaranteed to be present).
Defaults substitute for missing fields; an `ignore` array replaces the
default empty array only if the user provided one; a `rules` record is
shallow-merged over the default (currently empty).

## Supported file formats

A `promptlint.config.ts` file can `export default { ... }`,
`export const config = { ... }`, or `module.exports = { ... }` (CommonJS).
In any case the exported value must validate against the schema below.

A `promptlint.config.json` file is parsed as standard JSON.

## Configuration schema

```jsonc
{
  "failOn": "warning",             // "warning" | "error"  (default: "warning")
  "format": "human",               // "human"   | "json"   (default: "human")

  "ignore": [                      // glob patterns (gitignore-style)
    "dist/**",
    "coverage/**",
    "generated/**"
  ],

  "rules": {
    "structure/missing-model": "off",    // "off" | "info" | "warning" | "error"

    "quality/missing-output-schema": "error",

    "cost/high-token-estimate": {
      "severity": "warning",
      "options": {
        "maxTokens": 4000
      }
    }
  }
}
```

### Top-level keys

| Key       | Type                              | Default    | Description |
|-----------|-----------------------------------|------------|-------------|
| `failOn`  | `"warning" \| "error"`             | `"warning"` | Severity threshold for non-zero exit. `"info"` never fails the build. |
| `format`  | `"human" \| "json"`                | `"human"`   | Reporter format used by the CLI. |
| `ignore`  | `string[]`                         | `[]`        | Glob patterns to skip. Patterns are gitignore-style; `dist/**` matches any descendant. |
| `rules`   | `Record<string, RuleConfig>`       | `{}`        | Per-rule overrides. Rule ids not in the manifest are listed as a warning on stderr but do not change the scan outcome. |

### Rule values

A `RuleConfig` is either:

- A short string severity: `"off"`, `"info"`, `"warning"`, or `"error"`.
- A long-form object:

  ```ts
  {
    severity?: "off" | "info" | "warning" | "error",
    options?: Record<string, unknown>,
  }
  ```

  `severity` is optional - users may supply only `options` to override a
  rule's configurable parameters without changing its severity. `options`
  is opaque to this package - it is forwarded to the engine, which
  hands it to the rule's `check({ options, ... })` context.

### Validation

The schema is `.strict()`: unknown top-level keys raise a Zod
validation error rather than being silently ignored. The error is
surfaced as a `ConfigError` thrown by `loadConfig`, with a message that
names the offending file and includes Zod's per-key details. The CLI
converts that into exit code 2 and a clear stderr message.

## Ignore matcher

`createIgnoreMatcher(patterns)` compiles an array of glob strings into a
single path predicate. The matcher:

- Returns `false` (never ignore) for an empty pattern list.
- Trims and drops empty strings.
- Normalizes paths to forward slashes so a Windows absolute path
  (`C:\repo\dist\foo.prompt.md`) is matched as if it were
  `/C/repo/dist/foo.prompt.md`.
- Tests against the tail of each absolute path so a relative pattern
  like `dist/**` matches any descendant of any `dist/` directory at
  any depth (e.g. `/repo/dist/x.prompt.md` and
  `/repo/sub/dist/x.prompt.md`).

## Public API

```ts
export const DEFAULT_CONFIG: Readonly<PromptlintConfig>
export const promptlintConfigSchema: z.ZodType<PromptlintConfig>
export const ruleConfigSchema: z.ZodType<RuleConfig>
export const ruleSeveritySchema: z.ZodType<RuleSeverity>

export type PromptlintConfig        // resolved shape (all fields required)
export type PromptlintConfigInput   // permissive shape (all fields optional)
export type PromptlintConfigOutput  // strict output shape from Zod
export type RuleConfig
export type RuleSeverity

export class ConfigError extends Error

export function loadConfig(cwd: string): Promise<LoadConfigResult>
export function mergeConfig(input: PromptlintConfigInput): PromptlintConfig

export type IgnoreMatcher = (absolutePath: string) => boolean
export function createIgnoreMatcher(patterns: readonly string[]): IgnoreMatcher

export interface ResolvedRules {
  readonly ruleSeverity: Readonly<Record<string, Severity | "off">>
  readonly ruleOptions: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  readonly unknown: readonly UnknownRuleReference[]
}
export function resolveRules(
  ruleConfig: PromptlintConfig["rules"],
  knownRuleIds: ReadonlySet<string>,
): ResolvedRules
export function resolveRulesAgainstManifest(
  ruleConfig: PromptlintConfig["rules"],
  manifest: readonly { readonly id: string }[],
): ResolvedRules
```

## Architecture

| File | Responsibility |
|------|----------------|
| `schema.ts` | Zod schema and exported types. |
| `loader.ts` | Locate `promptlint.config.{ts,json}` upward from `cwd`; parse and validate the contents; throw `ConfigError` on any problem. |
| `merge.ts` | Merge a user config over `DEFAULT_CONFIG` into a single resolved shape. |
| `defaults.ts` | `DEFAULT_CONFIG` - the fall-back when no file exists. |
| `errors.ts` | `ConfigError` - the single exception type the loader raises. |
| `matchers.ts` | `IgnoreMatcher` and `createIgnoreMatcher`. |
| `resolve.ts` | `resolveRules` / `resolveRulesAgainstManifest` - turn the user's `rules` block into the engine input shape (`ruleSeverity` + `ruleOptions`). |
| `index.ts`   | Public exports. |

## Tests

The package ships with comprehensive tests:

- `src/index.test.ts` - schema and defaults (28 tests).
- `src/merge.test.ts` - merging semantics (8 tests).
- `src/loader.test.ts` - load + validate + precedence (12 tests).
- `src/matchers.test.ts` - glob matching (10 tests).
- `src/resolve.test.ts` - rule resolution + unknown handling (8 tests).

66 tests total.

Coverage:

- JSON config: `loader.test.ts` (loads, validates, errors).
- TS config: `loader.test.ts` (default + named + CommonJS shapes).
- Missing config: `loader.test.ts` (`returns DEFAULT_CONFIG`).
- Invalid config: `loader.test.ts` (throws `ConfigError`, message includes path).
- Unknown rule ids: `resolve.test.ts`.
- Invalid severities: `index.test.ts`.
- Invalid options shape: `index.test.ts`.
- Parent-directory lookup: `loader.test.ts`.
- Configuration precedence: `loader.test.ts`.
- Default fallback: `loader.test.ts`.
- Ignore patterns: `matchers.test.ts`.
- Rule option overrides: `resolve.test.ts` and `apps/cli/src/cli.config.test.ts`.
