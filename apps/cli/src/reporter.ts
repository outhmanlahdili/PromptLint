import { formatFindingsForHuman } from "@prompt-lint/reporter-human"
import { serializeJson, toJsonPayload } from "@prompt-lint/reporter-json"
import type { Finding } from "@prompt-lint/types"
import type { Format, ResolvedOptions } from "./types.js"

/**
 * The complete string the CLI writes to stdout for a scan, for either
 * format. Building this in one place (rather than streaming fragments)
 * keeps the quiet path trivial and makes the output snapshot-stable.
 */
export interface RenderedReport {
  readonly stdout: string
  readonly stderr: string
}

export interface RenderInput {
  readonly findings: readonly Finding[]
  readonly fileCount: number
  readonly ruleCount: number
  readonly durationMs: number
  readonly options: ResolvedOptions
}

/**
 * Render the scan output for the selected format.
 *
 * - `human` wraps the existing `formatFindingsForHuman` formatter and
 *   appends a concise summary line (files scanned, rules run, duration).
 * - `json` emits the stable {@link toJsonPayload} shape on a single line.
 *
 * The summary line for the human reporter is composed here rather than
 * inside `@prompt-lint/reporter-human` so this Phase-4 module owns the
 * the scan-level metadata (file/rule counts, duration) without expanding
 * the reporter package's contract.
 */
export function renderReport(input: RenderInput): RenderedReport {
  if (input.options.format === ("json" satisfies Format)) {
    return renderJson(input)
  }
  return renderHuman(input)
}

function renderHuman(input: RenderInput): RenderedReport {
  const block = formatFindingsForHuman({
    findings: [...input.findings],
    noColor: input.options.noColor,
  })
  const summary = humanSummaryLine(input)
  const stdout = `${block}\n${summary}\n`
  return { stdout, stderr: "" }
}

function renderJson(input: RenderInput): RenderedReport {
  // The JSON reporter contract is the findings array. Scan metadata
  // (fileCount/ruleCount/durationMs) is surfaced in the human summary
  // only; keeping the JSON payload to the documented schema means
  // downstream tooling depends on a stable shape.
  const payload = toJsonPayload([...input.findings])
  return { stdout: `${serializeJson(payload)}\n`, stderr: "" }
}

/**
 * Compose the single summary line appended under the findings block:
 *
 *   Scanned 3 file(s) with 10 rule(s) in 12ms — 2 finding(s).
 *
 * For the empty-target case (no prompt files found) a dedicated message
 * is emitted so the user can tell a clean scan apart from a mispointed
 * path.
 */
function humanSummaryLine(input: RenderInput): string {
  if (input.fileCount === 0) {
    return "No prompt files found."
  }
  const findingWord = input.findings.length === 1 ? "finding" : "findings"
  return (
    `Scanned ${input.fileCount} file(s) with ${input.ruleCount} rule(s) ` +
    `in ${input.durationMs}ms — ${input.findings.length} ${findingWord}.`
  )
}
