import { readFile } from "node:fs/promises"
import path from "node:path"
import {
  type IgnoreMatcher as ConfigIgnoreMatcher,
  createIgnoreMatcher,
  loadConfig,
  resolveRulesAgainstManifest,
} from "@prompt-lint/config"
import { parsePrompt } from "@prompt-lint/parser"
import { runEngine } from "@prompt-lint/rule-engine"
import { RULES_MANIFEST, getImplementedRules } from "@prompt-lint/rules"
import type { Finding, PromptFile, Severity } from "@prompt-lint/types"
import { SEVERITY_WEIGHT } from "@prompt-lint/types"
import { discoverPrompts } from "./discover.js"
import type { DiscoveredPrompt } from "./discover.js"
import { renderReport } from "./reporter.js"
import { ExitCode } from "./types.js"
import type { CliResult, FailOn, ResolvedOptions } from "./types.js"

/**
 * Rule id used when surfacing parser-returned errors (`ParseResult.errors`)
 * as findings. The parser already produces a partial `PromptFile` even on
 * failure, so the rest of the rules still run; the parser errors are
 * attached to the file path so they appear in both reporters.
 */
export const PARSER_ERROR_RULE_ID = "parser/parse-error"

/**
 * Outcome of the lint phase. `exitCode` is computed here (the single
 * source of truth for the success/failure threshold) so the dispatcher
 * and the bin never re-derive it.
 */
export interface LintOutcome extends CliResult {
  readonly exitCode: (typeof ExitCode)[keyof typeof ExitCode]
}

/**
 * Run the full PromptLint pipeline against `targetPath`:
 *
 *   loadConfig → merge CLI overrides → discover → read → parse → runEngine → render → exitCode
 *
 * This function performs all I/O (filesystem, parsing, engine) but does
 * NOT write to `process.stdout`/`stderr` or call `process.exit`. It
 * returns a {@link LintOutcome} so the dispatcher can route the rendered
 * text and exit code to the right place. This separation is what makes
 * the integration tests hermetic: they call `lint` directly and assert on
 * the returned strings.
 *
 * Configuration lookup starts at `process.cwd()` - the caller's working
 * directory - not the target path. This matches the spec's lookup order
 * ("Starting from the working directory") and lets a parent-directory
 * config affect a sub-directory scan.
 *
 * Failure modes:
 * - **Missing/unreadable target or discovery errors** → exit code 2
 *   (`Unexpected`), human-readable message on stderr, empty stdout.
 * - **Invalid configuration** → exit code 2, a clear `ConfigError`
 *   message naming the offending file (loader layer owns the message).
 * - **Parser errors** (e.g. malformed frontmatter) → surfaced as
 *   `parser/parse-error` findings at severity `error`; the file is still
 *   linted by the rule set.
 * - **Unknown rule references in the user's config** → reported on
 *   stderr but the scan still runs with the known portion of the
 *   config applied.
 * - **Unexpected exceptions** (parse throw, engine throw) → caught and
 *   reported as exit code 2.
 */
export async function lint(targetPath: string, options: ResolvedOptions): Promise<LintOutcome> {
  let configResult: Awaited<ReturnType<typeof loadConfig>>
  try {
    configResult = await loadConfig(process.cwd())
  } catch (err: unknown) {
    return fatal(options, err instanceof Error ? err.message : String(err))
  }

  // The merged config from `@prompt-lint/config` always populates
  // `ignore` (with the default when the user omits it), but Zod's
  // `.optional()` produces a `string[] | undefined` output type. The
  // runtime shape is guaranteed non-undefined by {@link mergeConfig}, so
  // widen with a cast here.
  const ignorePatterns = (configResult.config.ignore ?? []) as readonly string[]
  const ignoreMatcher: ConfigIgnoreMatcher = createIgnoreMatcher(ignorePatterns)
  const resolved = resolveRulesAgainstManifest(configResult.config.rules, RULES_MANIFEST)

  // CLI flags always beat config so the user can override on the command
  // line without editing the config file.
  const effectiveFailOn = options.failOn
  const effectiveFormat = options.format

  const unknownWarnings = formatUnknownRuleWarnings(resolved.unknown, configResult.filePath)

  const discovery = await discoverPrompts(targetPath, ignoreMatcher)
  if (discovery.errors.length > 0) {
    return fatal(options, discovery.errors.join("\n"))
  }
  if (discovery.prompts.length === 0) {
    return renderEmpty(targetPath, options, unknownWarnings)
  }

  try {
    const parsed = await parseAll(discovery.prompts)
    const files = parsed.map((entry) => entry.file)
    const parserFindings = collectParserFindings(parsed)

    const engine = await runEngine({
      rules: [...getImplementedRules()],
      files,
      ...(Object.keys(resolved.ruleSeverity).length === 0
        ? {}
        : { ruleSeverity: { ...resolved.ruleSeverity } }),
      ...(Object.keys(resolved.ruleOptions).length === 0
        ? {}
        : { ruleOptions: { ...resolved.ruleOptions } }),
    })

    const findings: readonly Finding[] = [...parserFindings, ...engine.findings]
    const report = renderReport({
      findings,
      fileCount: engine.stats.fileCount,
      ruleCount: engine.stats.ruleCount,
      durationMs: engine.stats.durationMs,
      options: { ...options, format: effectiveFormat },
    })

    const exitCode = computeExitCode(findings, effectiveFailOn)

    const silentOnSuccess = options.quiet && exitCode === ExitCode.Success
    const stdout = silentOnSuccess ? "" : report.stdout
    const stderr = silentOnSuccess ? "" : combineStderr(report.stderr, unknownWarnings)

    return { exitCode, stdout, stderr }
  } catch (err: unknown) {
    return fatal(options, unexpectedMessage(err))
  }
}

/**
 * Render the empty-prompt-files case. Honors `--quiet`: silent on
 * success, including the unknown-rule warnings so `--quiet` truly
 * suppresses all output when the scan succeeds.
 */
function renderEmpty(_targetPath: string, options: ResolvedOptions, warnings: string): LintOutcome {
  const report = renderReport({
    findings: [],
    fileCount: 0,
    ruleCount: 0,
    durationMs: 0,
    options: { ...options },
  })
  if (options.quiet) {
    return { exitCode: ExitCode.Success, stdout: "", stderr: "" }
  }
  return {
    exitCode: ExitCode.Success,
    stdout: report.stdout,
    stderr: combineStderr(report.stderr, warnings),
  }
}

function combineStderr(reportStderr: string, warnings: string): string {
  if (warnings.length === 0) return reportStderr
  return reportStderr.length === 0 ? warnings : `${reportStderr}${warnings}`
}

/**
 * Format a stderr warning block for unknown rule ids. Returning an empty
 * string means "no warnings"; a multi-line block ends with a newline.
 */
function formatUnknownRuleWarnings(
  unknown: readonly { ruleId: string; severity: string; options?: unknown }[],
  configFilePath: string | null,
): string {
  if (unknown.length === 0) return ""
  const header =
    configFilePath === null
      ? "Warning: unknown rule references in resolved configuration:"
      : `Warning: unknown rule references in ${configFilePath}:`
  const lines = unknown.map((u) => {
    const optionsSuffix = u.options === undefined ? "" : ` (options: ${JSON.stringify(u.options)})`
    return `  - ${u.ruleId} [${u.severity}]${optionsSuffix}`
  })
  return `${header}\n${lines.join("\n")}\n`
}

/**
 * A parsed prompt paired with any parser-emitted errors, retained through
 * the pipeline so parser errors can be converted into findings without a
 * second pass.
 */
interface ParsedEntry {
  readonly file: PromptFile
  readonly parserErrors: readonly { readonly message: string; readonly locationLine?: number }[]
}

async function parseAll(prompts: readonly DiscoveredPrompt[]): Promise<ParsedEntry[]> {
  const entries: ParsedEntry[] = []
  for (const prompt of prompts) {
    const source = await readFile(toOsPath(prompt.path), "utf8")
    const result = parsePrompt({ path: prompt.path, format: prompt.format, source })
    const parserErrors = result.errors.map((err) => {
      const line = err.location?.line
      return line === undefined
        ? { message: err.message }
        : { message: err.message, locationLine: line }
    })
    entries.push({ file: result.file, parserErrors })
  }
  return entries
}

/**
 * Translate parser-returned errors into `parser/parse-error` findings at
 * `error` severity, scoped to the offending file. Locations are best
 * effort: the parser reports 1-indexed lines when available.
 */
function collectParserFindings(entries: readonly ParsedEntry[]): readonly Finding[] {
  const findings: Finding[] = []
  for (const entry of entries) {
    for (const err of entry.parserErrors) {
      findings.push(
        Object.freeze({
          ruleId: PARSER_ERROR_RULE_ID,
          fileId: entry.file.id,
          filePath: entry.file.path,
          severity: "error" satisfies Severity,
          message: err.message,
          ...(err.locationLine === undefined
            ? {}
            : {
                location: Object.freeze({
                  line: err.locationLine,
                  column: 1,
                  endLine: err.locationLine,
                  endColumn: 1,
                }),
              }),
        }),
      )
    }
  }
  return Object.freeze(findings)
}

/**
 * Decide the exit code from the findings and the configured threshold.
 *
 * `Unexpected` (2) is reserved for invocation/runtime errors handled
 * elsewhere; this function only distinguishes success (0) from lint
 * failures (1). A finding fails when its weight is at least the
 * `--fail-on` weight — so `--fail-on warning` fails on `warning`+`error`
 * and `--fail-on error` only fails on `error`. `info` never fails.
 */
export function computeExitCode(
  findings: readonly Finding[],
  failOn: FailOn,
): (typeof ExitCode)[keyof typeof ExitCode] {
  const threshold = SEVERITY_WEIGHT[failOn]
  for (const finding of findings) {
    if (SEVERITY_WEIGHT[finding.severity] >= threshold) {
      return ExitCode.Failures
    }
  }
  return ExitCode.Success
}

/**
 * Build the result for a fatal (exit 2) condition: a single human-readable
 * message on stderr, nothing on stdout. JSON format still reports on
 * stderr as a plain message because a structured payload would imply a
 * successful scan.
 */
function fatal(options: ResolvedOptions, message: string): LintOutcome {
  void options
  return { exitCode: ExitCode.Unexpected, stdout: "", stderr: `${message}\n` }
}

function unexpectedMessage(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) {
    return `Unexpected error: ${err.message}`
  }
  return `Unexpected error: ${String(err)}`
}

/**
 * Convert a forward-slash path back to the platform separator for
 * filesystem APIs. Discovery stores forward-slash paths for deterministic
 * output; this localizes them again when reading.
 */
function toOsPath(p: string): string {
  return path.sep === "\\" ? p.replaceAll("/", "\\") : p
}
