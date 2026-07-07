import { collectVariables, scanVariables } from "@promptlint/parser"
import { makePromptFile } from "@promptlint/test-utils"
import type { Finding, PromptFile, RuleContext } from "@promptlint/types"

/**
 * Construct a `RuleContext` for a single rule call.
 *
 * The helper ports the engine's `runOneRuleOneFile` plumbing so unit tests
 * can exercise `rule.check(ctx)` directly without spinning up the engine.
 */
export function makeContext(
  file: PromptFile,
  options: Readonly<Record<string, unknown>> = {},
): { context: RuleContext; emitted: Omit<Finding, "ruleId" | "fileId" | "filePath">[] } {
  const emitted: Omit<Finding, "ruleId" | "fileId" | "filePath">[] = []
  const context: RuleContext = Object.freeze({
    file,
    options: Object.freeze({ ...options }),
    report: (raw: Omit<Finding, "ruleId" | "fileId" | "filePath">) => {
      emitted.push({ ...raw })
    },
  })
  return { context, emitted }
}

/**
 * Run a rule synchronously and return its emitted findings together with
 * any findings the rule returned from `check`.
 *
 * Variables in the body are extracted via `@promptlint/parser` so the
 * tests do not have to enumerate each `{{ var }}` reference manually.
 */
export async function runRule(
  rule: { check: (ctx: RuleContext) => RuleResult | Promise<RuleResult> },
  input: {
    path?: string
    body?: string
    frontmatter?: PromptFile["frontmatter"]
    variables?: PromptFile["variables"]
    format?: PromptFile["format"]
  } = {},
  options: Readonly<Record<string, unknown>> = {},
): Promise<{ findings: Finding[]; emitted: Omit<Finding, "ruleId" | "fileId" | "filePath">[] }> {
  const body = input.body ?? ""
  const occurrences = scanVariables(body)
  const variables = collectVariables(occurrences)
  const file = makePromptFile({
    path: input.path ?? "prompts/sample.prompt.md",
    format: input.format ?? ("prompt.md" as PromptFile["format"]),
    body,
    frontmatter: (input.frontmatter ?? {}) as PromptFile["frontmatter"],
    variables,
  })
  const { context, emitted } = makeContext(file, options)
  const result = await rule.check(context)
  return {
    findings: Array.isArray(result.findings) ? (result.findings as Finding[]) : [],
    emitted,
  }
}

interface RuleResult {
  findings: readonly unknown[]
}

/**
 * Convenience helper for tests that prefer to start from a parsed-style
 * `PromptFile` literal.
 */
export function frozen<T>(value: T): T {
  return Object.freeze(value)
}
