import type { Finding, PromptFile, RuleDefinition, Severity } from "@promptlint/types"
import { describe, expect, it } from "vitest"
import { declaredOptions, defineRule, resolveSeverity, runEngine } from "./index.js"

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function emptyFile(overrides: Partial<PromptFile> = {}): PromptFile {
  return Object.freeze({
    id: "f/one.prompt.md",
    path: "f/one.prompt.md",
    format: "prompt.md",
    body: "",
    frontmatter: Object.freeze({}),
    variables: Object.freeze([]),
    contentHash: "0000000000000000000000000000000000000000000000000000000000000000",
    ...overrides,
  })
}

function emptyFinding(message: string, severity: Severity = "info"): Finding {
  return Object.freeze({
    ruleId: "",
    fileId: "",
    filePath: "",
    message,
    severity,
  }) as Finding
}

function passingRule(overrides: Partial<RuleDefinition> = {}): RuleDefinition {
  return defineRule({
    id: "test/pass",
    description: "Always passes.",
    defaultSeverity: "info",
    check: () => ({ findings: [] }),
    ...overrides,
  })
}

function singleFindingRule(
  message: string,
  overrides: Partial<RuleDefinition> & { severity?: Severity } = {},
): RuleDefinition {
  return defineRule({
    id: "test/finding",
    description: "Emits one finding.",
    defaultSeverity: "warning",
    check: () => ({
      findings: [
        {
          ruleId: "",
          fileId: "",
          filePath: "",
          message,
          severity: overrides.severity ?? "warning",
        },
      ],
    }),
    ...overrides,
  })
}

function throwingRule(overrides: Partial<RuleDefinition> = {}): RuleDefinition {
  return defineRule({
    id: "test/throw",
    description: "Always throws.",
    defaultSeverity: "error",
    check: () => {
      throw new Error("Simulated rule failure")
    },
    ...overrides,
  })
}

function asyncRule(overrides: Partial<RuleDefinition> = {}): RuleDefinition {
  return defineRule({
    id: "test/async",
    description: "Async rule.",
    defaultSeverity: "warning",
    check: async (ctx) => ({
      findings: [
        {
          ruleId: "",
          fileId: "",
          filePath: "",
          message: `async checked ${ctx.file.id}`,
          severity: "warning",
        },
      ],
    }),
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// resolveSeverity & declaredOptions (Phase 0 helpers – keep existing coverage)
// ---------------------------------------------------------------------------

const makeRule = (overrides: Partial<RuleDefinition> = {}): RuleDefinition => ({
  id: "quality/example-rule",
  description: "Example rule for tests.",
  defaultSeverity: "warning",
  check: () => ({ findings: [] }),
  ...overrides,
})

describe("resolveSeverity", () => {
  it("returns the rule's default severity when no override is supplied", () => {
    expect(resolveSeverity(makeRule(), undefined)).toBe("warning")
  })

  it("returns the override when supplied", () => {
    const override = { "quality/example-rule": "error" } as const
    expect(resolveSeverity(makeRule(), override)).toBe("error")
  })

  it("returns null when the rule is disabled", () => {
    const override = { "quality/example-rule": "off" } as const
    expect(resolveSeverity(makeRule(), override)).toBeNull()
  })
})

describe("declaredOptions", () => {
  it("returns an empty array when the rule declares no options", () => {
    expect(declaredOptions(makeRule())).toEqual([])
  })

  it("returns the rule's declared options unchanged", () => {
    const rule = makeRule({
      options: [{ name: "threshold", type: "number", default: 100, description: "Threshold." }],
    })
    expect(declaredOptions(rule)).toHaveLength(1)
    expect(declaredOptions(rule)[0]?.name).toBe("threshold")
  })
})

// ---------------------------------------------------------------------------
// defineRule
// ---------------------------------------------------------------------------

describe("defineRule", () => {
  it("returns a frozen rule definition", () => {
    const rule = defineRule({
      id: "test/frozen",
      description: "Frozen rule.",
      defaultSeverity: "info",
      check: () => ({ findings: [] }),
    })
    expect(Object.isFrozen(rule)).toBe(true)
  })

  it("copies all fields from the input", () => {
    const rule = defineRule({
      id: "test/copy",
      description: "Copy test.",
      defaultSeverity: "error",
      options: [{ name: "opt", type: "boolean", default: false, description: "An option." }],
      schema: { type: "object" },
      check: () => ({ findings: [] }),
    })
    expect(rule.id).toBe("test/copy")
    expect(rule.description).toBe("Copy test.")
    expect(rule.defaultSeverity).toBe("error")
    expect(rule.options).toHaveLength(1)
    expect(rule.schema).toEqual({ type: "object" })
  })
})

// ---------------------------------------------------------------------------
// runEngine – core pipeline
// ---------------------------------------------------------------------------

describe("runEngine", () => {
  // --- basic behaviour ---

  it("returns empty findings when no rules are registered", async () => {
    const result = await runEngine({ files: [emptyFile()], rules: [] })
    expect(result.findings).toEqual([])
    expect(result.stats.fileCount).toBe(1)
    expect(result.stats.ruleCount).toBe(0)
    expect(result.stats.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("returns empty findings when no files are supplied", async () => {
    const result = await runEngine({ files: [], rules: [passingRule()] })
    expect(result.findings).toEqual([])
    expect(result.stats.fileCount).toBe(0)
    expect(result.stats.ruleCount).toBe(1)
  })

  it("collects findings from a single rule over a single file", async () => {
    const result = await runEngine({
      files: [emptyFile()],
      rules: [singleFindingRule("missing description")],
    })
    expect(result.findings).toHaveLength(1)
    const f = result.findings[0]
    expect(f?.ruleId).toBe("test/finding")
    expect(f?.fileId).toBe("f/one.prompt.md")
    expect(f?.filePath).toBe("f/one.prompt.md")
    expect(f?.severity).toBe("warning")
    expect(f?.message).toBe("missing description")
  })

  // --- severity resolution ---

  it("uses the rule's default severity when no override is configured", async () => {
    const result = await runEngine({
      files: [emptyFile()],
      rules: [singleFindingRule("msg")], // defaultSeverity: "warning"
    })
    expect(result.findings[0]?.severity).toBe("warning")
  })

  it("applies severity override from ruleSeverity map", async () => {
    const result = await runEngine({
      files: [emptyFile()],
      rules: [singleFindingRule("msg")],
      ruleSeverity: { "test/finding": "error" },
    })
    expect(result.findings[0]?.severity).toBe("error")
  })

  it("skips disabled rules (severity override is 'off')", async () => {
    const result = await runEngine({
      files: [emptyFile()],
      rules: [singleFindingRule("should not appear")],
      ruleSeverity: { "test/finding": "off" },
    })
    expect(result.findings).toEqual([])
    expect(result.stats.ruleCount).toBe(0)
  })

  it("a finding can override its own severity per-emission", async () => {
    const rule = defineRule({
      id: "test/per-emit",
      description: "Per-emission severity.",
      defaultSeverity: "info",
      check: () => ({
        findings: [
          { ruleId: "", fileId: "", filePath: "", message: "a", severity: "error" as Severity },
          { ruleId: "", fileId: "", filePath: "", message: "b", severity: "info" as Severity },
        ],
      }),
    })
    const result = await runEngine({ files: [emptyFile()], rules: [rule] })
    expect(result.findings).toHaveLength(2)
    expect(result.findings[0]?.severity).toBe("error")
    expect(result.findings[1]?.severity).toBe("info")
  })

  // --- error isolation ---

  it("surfaces rule throw as an error finding without stopping the engine", async () => {
    const result = await runEngine({
      files: [emptyFile()],
      rules: [throwingRule(), singleFindingRule("still works")],
    })
    const throwFinding = result.findings.find((f) => f.ruleId === "test/throw")
    expect(throwFinding).toBeDefined()
    expect(throwFinding?.severity).toBe("error")
    expect(throwFinding?.message).toContain("Simulated rule failure")

    const normalFinding = result.findings.find((f) => f.ruleId === "test/finding")
    expect(normalFinding).toBeDefined()
    expect(normalFinding?.message).toBe("still works")
  })

  it("surfaces non-Error throws with a string message", async () => {
    const rule = defineRule({
      id: "test/throw-string",
      description: "Throws a string.",
      defaultSeverity: "warning",
      check: () => {
        // eslint-disable-next-line no-throw-literal
        throw "raw string error"
      },
    })
    const result = await runEngine({ files: [emptyFile()], rules: [rule] })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.message).toContain("raw string error")
  })

  // --- report() callback ---

  it("honours findings emitted via the report() callback", async () => {
    const rule = defineRule({
      id: "test/reporter",
      description: "Uses report().",
      defaultSeverity: "warning",
      check: (ctx) => {
        ctx.report({ message: "via report", severity: "error" })
        return { findings: [] }
      },
    })
    const result = await runEngine({ files: [emptyFile()], rules: [rule] })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.message).toBe("via report")
    expect(result.findings[0]?.severity).toBe("error")
    expect(result.findings[0]?.ruleId).toBe("test/reporter")
    expect(result.findings[0]?.fileId).toBe("f/one.prompt.md")
  })

  // --- deduplication ---

  it("deduplicates identical findings emitted via both report() and return value", async () => {
    const sharedFinding: Finding = {
      ruleId: "",
      fileId: "",
      filePath: "",
      message: "shared",
      severity: "info",
    }
    const rule = defineRule({
      id: "test/dup",
      description: "Duplicates.",
      defaultSeverity: "warning",
      check: (ctx) => {
        ctx.report(sharedFinding)
        return { findings: [sharedFinding] }
      },
    })
    const result = await runEngine({ files: [emptyFile()], rules: [rule] })
    expect(result.findings).toHaveLength(1)
  })

  // --- async rules ---

  it("awaits async rule checks", async () => {
    const result = await runEngine({
      files: [emptyFile({ id: "async-test.prompt.md" })],
      rules: [asyncRule()],
    })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.message).toContain("async-test.prompt.md")
  })

  // --- deterministic sort ---

  it("sorts findings by ruleId then fileId", async () => {
    const fileA = emptyFile({ id: "a.prompt.md", path: "a.prompt.md" })
    const fileB = emptyFile({ id: "b.prompt.md", path: "b.prompt.md" })
    const ruleX = singleFindingRule("x", { id: "rule/x" })
    const ruleY = singleFindingRule("y", { id: "rule/y" })

    const result = await runEngine({
      files: [fileB, fileA], // unordered input
      rules: [ruleY, ruleX], // unordered input
    })

    const ids = result.findings.map((f) => `${f.ruleId}|${f.fileId}`)
    expect(ids).toEqual([
      "rule/x|a.prompt.md",
      "rule/x|b.prompt.md",
      "rule/y|a.prompt.md",
      "rule/y|b.prompt.md",
    ])
  })

  // --- multiple files / rules ---

  it("runs every rule against every file", async () => {
    const files = [emptyFile({ id: "f1.md" }), emptyFile({ id: "f2.md" })]
    const rules = [singleFindingRule("a"), singleFindingRule("b")]
    const result = await runEngine({ files, rules })
    expect(result.findings).toHaveLength(4)
  })

  // --- stats ---

  it("computes severity tally in stats", async () => {
    const ruleInfo = defineRule({
      id: "stats/info",
      description: "Info rule.",
      defaultSeverity: "info",
      check: () => ({ findings: [emptyFinding("info msg", "info")] }),
    })
    const ruleWarn = singleFindingRule("warn msg", { severity: "warning" })
    const ruleErr = singleFindingRule("err msg", { severity: "error" })

    const result = await runEngine({
      files: [emptyFile()],
      rules: [ruleInfo, ruleWarn, ruleErr],
    })

    expect(result.stats.bySeverity.info).toBe(1)
    expect(result.stats.bySeverity.warning).toBe(1)
    expect(result.stats.bySeverity.error).toBe(1)
  })

  it("records non-negative duration", async () => {
    const result = await runEngine({ files: [emptyFile()], rules: [passingRule()] })
    expect(result.stats.durationMs).toBeGreaterThanOrEqual(0)
  })

  // --- rule options ---

  it("passes resolved rule options to check context", async () => {
    const rule = defineRule({
      id: "test/opts",
      description: "Reads options.",
      defaultSeverity: "info",
      check: (ctx) => ({
        findings: [emptyFinding(`got threshold=${ctx.options.threshold as number}`)],
      }),
    })
    const result = await runEngine({
      files: [emptyFile()],
      rules: [rule],
      ruleOptions: { "test/opts": Object.freeze({ threshold: 42 }) },
    })
    expect(result.findings[0]?.message).toContain("threshold=42")
  })

  it("provides empty options object when no ruleOptions configured", async () => {
    const rule = defineRule({
      id: "test/opts-empty",
      description: "Empty options.",
      defaultSeverity: "info",
      check: (ctx) => ({
        findings: [emptyFinding(`keys=${Object.keys(ctx.options).length}`)],
      }),
    })
    const result = await runEngine({ files: [emptyFile()], rules: [rule] })
    expect(result.findings[0]?.message).toBe("keys=0")
  })

  // --- frozen results ---

  it("returns a deeply frozen engine result", async () => {
    const result = await runEngine({
      files: [emptyFile()],
      rules: [singleFindingRule("msg")],
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.findings)).toBe(true)
    expect(Object.isFrozen(result.stats)).toBe(true)
    expect(Object.isFrozen(result.stats.bySeverity)).toBe(true)
    for (const f of result.findings) {
      expect(Object.isFrozen(f)).toBe(true)
    }
  })

  // --- empty frontmatter guard ---

  it("passes a file with empty frontmatter without crashing", async () => {
    const file = emptyFile({ frontmatter: Object.freeze({}) })
    const result = await runEngine({
      files: [file],
      rules: [passingRule()],
    })
    expect(result.findings).toEqual([])
  })

  // --- rule context exposes file fields ---

  it("exposes file fields to the rule via context", async () => {
    const rule = defineRule({
      id: "test/ctx-file",
      description: "Reads context.file.",
      defaultSeverity: "info",
      check: (ctx) => ({
        findings: [emptyFinding(`${ctx.file.id}|${ctx.file.format}|${ctx.file.body}`)],
      }),
    })
    const file = emptyFile({ id: "ctx.md", body: "hello", format: "prompt.md" })
    const result = await runEngine({ files: [file], rules: [rule] })
    expect(result.findings[0]?.message).toBe("ctx.md|prompt.md|hello")
  })

  // --- context is frozen ---

  it("provides a frozen context to rules", async () => {
    let capturedCtx: unknown = undefined
    const rule = defineRule({
      id: "test/ctx-frozen",
      description: "Captures context.",
      defaultSeverity: "info",
      check: (ctx) => {
        capturedCtx = ctx
        return { findings: [] }
      },
    })
    await runEngine({ files: [emptyFile()], rules: [rule] })
    expect(Object.isFrozen(capturedCtx)).toBe(true)
  })
})
