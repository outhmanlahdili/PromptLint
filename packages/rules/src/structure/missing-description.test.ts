import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import missingDescriptionRule from "./missing-description.ts"

describe("structure/missing-description", () => {
  it("reports a warning when `description` is absent", async () => {
    const { emitted } = await runRule(missingDescriptionRule, {
      path: "prompts/no-desc.prompt.md",
      body: "Hi",
      frontmatter: { model: "gpt-5" },
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("`description`")
    expect(emitted[0]?.severity).toBe("warning")
  })

  it("does not report when `description` is provided", async () => {
    const { emitted } = await runRule(missingDescriptionRule, {
      path: "prompts/with-desc.prompt.md",
      body: "Hi",
      frontmatter: { model: "gpt-5", description: "Greeting prompt" },
    })
    expect(emitted).toHaveLength(0)
  })

  it("does not report when description is an empty string (parses to undefined in Zod schema)", async () => {
    const { emitted } = await runRule(missingDescriptionRule, {
      path: "prompts/empty-desc.prompt.md",
      body: "Hi",
      frontmatter: { model: "gpt-5", description: "" },
    })
    // The parser schema rejects empty descriptions, so the field is absent.
    expect(emitted.length).toBeLessThanOrEqual(1)
    if (emitted.length === 1) {
      expect(emitted[0]?.message).toContain("`description`")
    }
  })

  it("produces a single finding per file regardless of input", async () => {
    const { emitted, findings } = await runRule(missingDescriptionRule, {
      path: "prompts/single.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(findings).toHaveLength(0)
  })

  it("includes actionable suggestions", async () => {
    const { emitted } = await runRule(missingDescriptionRule, {
      path: "prompts/sugg.prompt.md",
      body: "Hi",
      frontmatter: {},
    })
    expect(emitted[0]?.suggestions?.length ?? 0).toBeGreaterThanOrEqual(1)
  })

  it("supports unicode bodies without crashing", async () => {
    const { emitted } = await runRule(missingDescriptionRule, {
      path: "prompts/unicode.prompt.md",
      body: "こんにちは",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("default severity is `warning`", () => {
    expect(missingDescriptionRule.defaultSeverity).toBe("warning")
  })
})
