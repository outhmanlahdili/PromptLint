# @promptlint/cli

PromptLint command-line interface. Lint your prompts. Catch regressions
before your users do.

## Phase 4 status — complete

The CLI wires the full PromptLint pipeline end-to-end: file discovery →
parsing → rule engine → reporting. It is usable from the terminal via the
`promptlint` bin.

## Quick start

```bash
# From the repo root (workspace-aware):
pnpm exec promptlint check .

# Lint a specific file:
pnpm exec promptlint check prompts/example.prompt.md

# JSON output for CI:
pnpm exec promptlint check . --format json

# Only fail on errors (not warnings):
pnpm exec promptlint check . --fail-on error

# Quiet mode (suppress output on success):
pnpm exec promptlint check . --quiet
```

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

When scanning a directory, the CLI automatically skips:

- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `coverage/`

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No findings above the `--fail-on` threshold. |
| `1` | One or more findings at or above `--fail-on`. |
| `2` | Invalid invocation, unreadable target, or runtime error. |

## Architecture

```
bin/promptlint.ts        ← tsx launcher (shebang, argv → runCli)
src/
  cli.ts                 ← runCli: dispatches help/version/check
  options.ts             ← parseCliArgs via node:util parseArgs
  discover.ts            ← recursive file walker, ignore-list pruning
  lint.ts                ← discover → read → parse → runEngine → exitCode
  reporter.ts            ← format selection (human / json)
  help.ts                ← --help text and --version reader
  types.ts               ← CliResult, ResolvedOptions, ExitCode
  index.ts               ← public API surface
```

The bin shim and `runCli` never perform business logic. Every decision
flows through the orchestrator (`lint.ts`) which returns a structured
`CliResult` — making the pipeline fully testable in-process.

## Tests

- **`src/cli.test.ts`** — 32 integration tests: argument validation,
  single-file and directory linting, exit codes, output formats,
  `--quiet`, `--no-color`, parser failures, ignored directories.
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
