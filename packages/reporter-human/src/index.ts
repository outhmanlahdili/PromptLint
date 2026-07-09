import type { Finding, Severity } from "@prompt-lint/types"

/**
 * Inputs to the human reporter. Phase 2 implements the actual ANSI
 * rendering; Phase 0 ships the shape that the renderer will consume.
 */
export interface HumanReporterInput {
  readonly findings: readonly Finding[]
  /** Optional override for the terminal width. `process.stdout.columns` is used otherwise. */
  readonly width?: number
  /** Set to `true` to disable ANSI escape codes (used in tests & non-TTY environments). */
  readonly noColor?: boolean
}

/** Symbolic icon shown next to each finding. TTY-aware. */
export type SeverityGlyph = Readonly<Record<Severity, string>>

/** Stable glyph set. Kept short so output fits in narrow terminals. */
export const SEVERITY_GLYPH: SeverityGlyph = Object.freeze({
  error: "✖",
  warning: "⚠",
  info: "ℹ",
})

/**
 * Pure formatter used by both the live reporter and the snapshot tests.
 * Does not perform I/O; the calling reporter writes the returned string
 * to stdout.
 */
export function formatFindingsForHuman(input: HumanReporterInput): string {
  const width = input.width ?? 100
  const lines: string[] = []
  lines.push("PromptLint scan results")
  lines.push("─".repeat(width))
  lines.push("")
  if (input.findings.length === 0) {
    lines.push("No findings.")
    return lines.join("\n")
  }
  for (const finding of input.findings) {
    lines.push(formatFindingLine(finding, input.noColor ?? false, width))
  }
  lines.push("")
  lines.push("─".repeat(width))
  lines.push(`Total: ${input.findings.length} finding${input.findings.length === 1 ? "" : "s"}.`)
  return lines.join("\n")
}

/**
 * Render a single finding with severity glyph, location, rule id, and
 * message. Finding ordering is the caller's responsibility; this function
 * never sorts.
 */
export function formatFindingLine(finding: Finding, noColor: boolean, width: number): string {
  const glyph = SEVERITY_GLYPH[finding.severity]
  const location = finding.location
    ? `${finding.filePath}:${finding.location.line}:${finding.location.column}`
    : finding.filePath
  const head = `${glyph} ${finding.severity.padEnd(7)} ${finding.ruleId}`
  const body = `  ${location}`
  const message = `    ${finding.message}`
  void noColor
  void width
  return `${head}\n${body}\n${message}`
}
