import { readFile } from "node:fs/promises"
import path from "node:path"
import { parsePrompt } from "@promptlint/parser"
import { runEngine } from "@promptlint/rule-engine"
import { getImplementedRules } from "@promptlint/rules"
import type { Finding, PromptFile, Severity } from "@promptlint/types"
import { SEVERITY_WEIGHT } from "@promptlint/types"
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
 *   discover → read → parse → runEngine → render → exitCode
 *
 * This function performs all I/O (filesystem, parsing, engine) but does
 * NOT write to `process.stdout`/`stderr` or call `process.exit`. It
 * returns a {@link LintOutcome} so the dispatcher can route the rendered
 * text and exit code to the right place. This separation is what makes
 * the integration tests hermetic: they call `lint` directly and assert on
 * the returned strings.
 *
 * Failure modes:
 * - **Missing/unreadable target or discovery errors** → exit code 2
 *   (`Unexpected`), human-readable message on stderr, empty stdout.
 * - **Parser errors** (e.g. malformed frontmatter) → surfaced as
 *   `parser/parse-error` findings at severity `error`; the file is still
 *   linted by the rule set.
 * - **Unexpected exceptions** (parse throw, engine throw) → caught and
 *   reported as exit code 2.
 */
export async function lint(targetPath: string, options: ResolvedOptions): Promise<LintOutcome> {
  const discovery = await discoverPrompts(targetPath)

  if (discovery.errors.length > 0) {
    return fatal(options, discovery.errors.join("\n"))
  }
  if (discovery.prompts.length === 0) {
    return emptyScan(options)
  }

  try {
    const parsed = await parseAll(discovery.prompts)
    const files = parsed.map((entry) => entry.file)
    const parserFindings = collectParserFindings(parsed)

    const engine = await runEngine({
      rules: [...getImplementedRules()],
      files,
    })

    const findings: readonly Finding[] = [...parserFindings, ...engine.findings]
    const report = renderReport({
      findings,
      fileCount: engine.stats.fileCount,
      ruleCount: engine.stats.ruleCount,
      durationMs: engine.stats.durationMs,
      options,
    })

    const exitCode = computeExitCode(findings, options.failOn)

    if (options.quiet && exitCode === ExitCode.Success) {
      return { exitCode, stdout: "", stderr: "" }
    }
    return { exitCode, stdout: report.stdout, stderr: report.stderr }
  } catch (err: unknown) {
    return fatal(options, unexpectedMessage(err))
  }
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
 * Build the result for a scan that found zero prompt files. This is a
 * clean success (exit 0) — the user pointed PromptLint at a directory
 * that simply contains no prompts — but we still surface a message so the
 * output is not empty. `--quiet` suppresses it.
 */
function emptyScan(options: ResolvedOptions): LintOutcome {
  const report = renderReport({
    findings: [],
    fileCount: 0,
    ruleCount: 0,
    durationMs: 0,
    options,
  })
  if (options.quiet) {
    return { exitCode: ExitCode.Success, stdout: "", stderr: "" }
  }
  return { exitCode: ExitCode.Success, stdout: report.stdout, stderr: report.stderr }
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
