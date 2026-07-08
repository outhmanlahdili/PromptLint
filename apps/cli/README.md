# @promptlint/cli

PromptLint command-line interface. Lint your prompts. Catch regressions
before your users do.

## Phase 5 status — complete

The CLI wires the full PromptLint pipeline end-to-end (file discovery →
parsing → rule engine → reporting) and consumes `@promptlint/config`
for the user's resolved configuration. Configuration influences
`failOn`, `format`, `ignore` patterns, and per-rule severity plus
options; command-line flags always take precedence over the config.

## Quick start

The repository's root `package.json` exposes a `promptlint` script
backed by `scripts/run-cli.mjs`. The launcher re-execs the CLI's tsx
binary in-process so it works regardless of pnpm's `.bin` link policy
and preserves the caller's working directory. From the repo root:

```bash
# Show usage:
pnpm promptlint --help

# Lint every prompt file in the workspace:
pnpm promptlint check .

# Lint a specific file:
pnpm promptlint check prompts/example.prompt.md

# JSON output for CI:
pnpm promptlint check . --format json

# Only fail on errors (not warnings):
pnpm promptlint check . --fail-on error

# Quiet mode (suppress output on success):
pnpm promptlint check . --quiet
```

Relative path arguments (`check ./test.prompt.md`, `check .`) resolve
against the caller's working directory, not against `apps/cli/`. The
launcher reads `INIT_CWD` (set by pnpm) and forwards it to the CLI's
spawn context so the CLI's own `process.cwd()` matches what the user
typed in their shell.

### How the launcher works

`scripts/run-cli.mjs` (root) resolves `apps/cli/bin/promptlint.ts`
relative to its own location and spawns a child Node process with:

```
node --import <absolute-path-to-apps/cli/node_modules/tsx/dist/loader.mjs>
     apps/cli/bin/promptlint.ts <argv>
```

- The `--import` is an ESM loader hook registered as a `file://` URL, so
  it does not rely on `node_modules/.bin` shims (which pnpm does not
  always create).
- The child's CWD is set from `INIT_CWD` so relative paths resolve from
  the caller's directory. Falls back to the parent's CWD if `INIT_CWD`
  is unset.
- argv is forwarded verbatim; nothing in the launcher distinguishes
  valid CLI flags from any other argument.

The CLI does not register a `node_modules/.bin/promptlint` shim during
a workspace `pnpm install`. Use the `pnpm promptlint ...` root script;
calling `tsx` directly via `pnpm --filter @promptlint/cli exec tsx …`
is unsupported because it depends on pnpm's `.bin` link policy and is
not part of the documented developer workflow.

## Commands

### `promptlint check <path>`

Lint prompt files at the given file or directory path. `<path>` can be:

- A single prompt file (e.g. `prompts/example.prompt.md`).
- A directory, which is scanned recursively for prompt files.

Run `promptlint --help` for the full usage reference.

## Options

| Flag | Values | Default | Description |
|---|---|---|---|
| `-h, --help` | — | — | Show usage and exit. |
| `-V, --version` | — | — | Print version and exit. |
| `--format` | `human`, `json` | `human` | Output format. |
| `--fail-on` | `warning`, `error` | `warning` | Severity threshold for non-zero exit. |
| `-q, --quiet` | flag | off | Suppress all output on success. |
| `--no-color` | flag | auto | Disable ANSI color codes. |

## Supported formats

| Extension | Format |
|---|---|
| `.prompt.md` | `prompt.md` |
| `.prompt.ts` | `prompt.ts` |
| `.prompt.json` | `prompt.json` |

## Ignored directories

When scanning a directory, the CLI automatically skips these default
directories (matches by base name rather than path):

- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `coverage/`

Additional paths can be skipped via a `promptlint.config.{ts,json}`
file's `ignore` array (gitignore-style globs):

```jsonc
{
  "ignore": [
    "dist/**",
    "coverage/**",
    "generated/**"
  ]
}
```

See [`packages/config/README.md`](../../packages/config/README.md) for
the full configuration schema.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No findings above the threshold (CLI flag or config `failOn`). |
| `1` | One or more findings at or above the threshold. |
| `2` | Invalid invocation, unreadable target, invalid configuration, or runtime error. |

## Configuration

The CLI loads `promptlint.config.{ts,json}` from the caller's working
directory before resolving any CLI flags. The full schema and lookup
behaviour are documented in
[`packages/config/README.md`](../../packages/config/README.md). A
minimal example:

```jsonc
// promptlint.config.json
{
  "failOn": "warning",
  "format": "human",
  "ignore": ["dist/**", "coverage/**"],
  "rules": {
    "structure/missing-model": "off",
    "quality/missing-output-schema": "error",
    "cost/high-token-estimate": {
      "severity": "warning",
      "options": { "maxTokens": 4000 }
    }
  }
}
```

CLI flags always win: `pnpm promptlint check . --fail-on error --format json`
applies `error` as the threshold and `json` as the format regardless
of the config file. Anything else (`ignore` patterns, rule severities,
rule options) flows from the config file into the engine.

Invalid configuration produces a `ConfigError`, prints a message on
stderr naming the offending file, and exits with code 2.

## Architecture

```
bin/promptlint.ts          ← tsx launcher (shebang, argv → runCli)
scripts/run-cli.mjs        ← root launcher (in repo root, used by pnpm promptlint …)
src/
  cli.ts                   ← runCli: dispatches help/version/check
  options.ts               ← parseCliArgs via node:util parseArgs
  discover.ts              ← recursive file walker, hard-coded ignores,
                              optional user-supplied ignore matcher
  lint.ts                  ← loadConfig → discover → read → parse →
                              runEngine → render → exitCode
  reporter.ts              ← format selection (human / json)
  help.ts                  ← --help text and --version reader
  types.ts                 ← CliResult, ResolvedOptions, ExitCode
  index.ts                 ← public API surface
```

The bin shim and `runCli` never perform business logic. Every decision
flows through the orchestrator (`lint.ts`) which returns a structured
`CliResult` — making the pipeline fully testable in-process.

## Tests

- **`src/cli.test.ts`** — 32 integration tests: argument validation,
  single-file and directory linting, exit codes, output formats,
  `--quiet`, `--no-color`, parser failures, ignored directories.
- **`src/cli.config.test.ts`** — 10 integration tests: config loading
  (JSON, parent-directory walk), precedence (CLI flag > config),
  default fallback, `ignore` patterns, rule severity & option
  overrides, invalid config handling, unknown-rule warnings.
- **`src/bin.smoke.test.ts`** — 6 subprocess smoke tests: real `tsx`
  bin launch proving terminal usability.

## Public API

The orchestration layer is exported from `src/index.ts` so host
applications can drive the pipeline in-process:

```ts
import { runCli } from "@promptlint/cli"
const result = await runCli(["check", "prompts/"], import.meta.url)
// result.exitCode, result.stdout, result.stderr
```
