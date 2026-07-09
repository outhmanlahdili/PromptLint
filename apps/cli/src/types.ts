import type { Severity } from "@prompt-lint/types"

/**
 * Output format selected by `--format`. The CLI translates the string
 * value into a discriminator and never re-parses it after this module
 * resolves the option.
 */
export type Format = "human" | "json"

/**
 * Severity threshold that flips the process exit code from success to
 * failure. `--fail-on warning` (the default) fails on `warning` and
 * `error`; `--fail-on error` only fails on `error`. `info` never fails
 * the build regardless of this setting.
 */
export type FailOn = Exclude<Severity, "info">

/**
 * Fully resolved CLI options handed to the orchestration layer. Every
 * field is populated with a sensible default so downstream code never
 * performs `undefined` checks on user-facing knobs.
 */
export interface ResolvedOptions {
  readonly format: Format
  readonly failOn: FailOn
  readonly quiet: boolean
  readonly noColor: boolean
}

/**
 * The structured outcome of a CLI invocation. `runCli` returns this
 * instead of writing to streams or calling `process.exit`, so tests can
 * assert on every field in-process. The bin shim is the only place that
 * translates `exitCode` into a real process exit.
 */
export interface CliResult {
  readonly exitCode: ExitCodeLike
  readonly stdout: string
  readonly stderr: string
}

/**
 * Numeric exit-code contract. Kept as a plain object (not a `const enum`)
 * so the values survive type erasure when the CLI runs from source via
 * tsx.
 */
export const ExitCode = {
  /** No findings above the configured threshold. */
  Success: 0,
  /** One or more findings at or above the `--fail-on` threshold. */
  Failures: 1,
  /** Invalid invocation, unreadable target, or unexpected runtime error. */
  Unexpected: 2,
} as const

export type ExitCodeLike = (typeof ExitCode)[keyof typeof ExitCode]
