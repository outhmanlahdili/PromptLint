/**
 * Public surface of `@promptlint/cli`.
 *
 * The orchestration layer (discovery, parsing, engine wiring, exit-code
 * computation) is exported so host applications and tests can drive the
 * pipeline in-process without spawning the bin. The bin shim at
 * `bin/promptlint.ts` is the only place that performs process I/O.
 */
export { runCli } from "./cli.js"
export { lint, computeExitCode, PARSER_ERROR_RULE_ID } from "./lint.js"
export { parseCliArgs, CliArgumentError } from "./options.js"
export { discoverPrompts, formatForFile, IGNORED_DIRECTORY_NAMES } from "./discover.js"
export { renderReport } from "./reporter.js"
export { HELP_TEXT, readVersion } from "./help.js"
export { ExitCode } from "./types.js"
export type {
  CliResult,
  FailOn,
  Format,
  ResolvedOptions,
  ExitCodeLike,
} from "./types.js"
export type { DiscoveredPrompt, DiscoveryResult } from "./discover.js"
export type { RenderedReport, RenderInput } from "./reporter.js"
export type { ParsedCli } from "./options.js"
export type { LintOutcome } from "./lint.js"
