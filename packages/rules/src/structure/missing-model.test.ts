import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import missingModelRule from "./missing-model.ts"

describe("structure/missing-model", () => {
  it("reports a warning when `model` is absent from frontmatter", async () => {
    const { emitted } = await runRule(missingModelRule, {
      path: "prompts/no-model.prompt.md",
      body: "Hello, world.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]).toMatchObject({
      message: expect.stringContaining("`model`"),
      severity: "warning",
    })
    expect(emitted[0]?.suggestions?.length ?? 0).toBeGreaterThan(0)
  })

  it("does not report when `model` is present", async () => {
    const { emitted } = await runRule(missingModelRule, {
      path: "prompts/with-model.prompt.md",
      body: "Hello, world.",
      frontmatter: { model: "gpt-5" },
    })
    expect(emitted).toHaveLength(0)
  })

  it("does not report when `model` is explicitly empty string", async () => {
    const { emitted } = await runRule(missingModelRule, {
      path: "prompts/empty-model.prompt.md",
      body: "Hello, world.",
      frontmatter: { model: "" },
    })
    expect(emitted).toHaveLength(0)
  })

  it("emits exactly one finding for an empty prompt", async () => {
    const { emitted, findings } = await runRule(missingModelRule, {
      path: "prompts/empty.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(findings).toHaveLength(0)
  })

  it("respects the `warning` default severity", () => {
    expect(missingModelRule.defaultSeverity).toBe("warning")
  })

  it("supports unicode content in the body without breaking", async () => {
    const { emitted } = await runRule(missingModelRule, {
      path: "prompts/unicode.prompt.md",
      body: "Bonjour 🌍 — {{ name }}",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("does not duplicate findings on repeated invocations", async () => {
    const { emitted: first } = await runRule(missingModelRule, {
      path: "prompts/dup.prompt.md",
      body: "Hi",
      frontmatter: {},
    })
    const { emitted: second } = await runRule(missingModelRule, {
      path: "prompts/dup.prompt.md",
      body: "Hi",
      frontmatter: {},
    })
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    expect(first[0]?.message).toBe(second[0]?.message)
  })

  it("produces no location object since the field is metadata-level", async () => {
    const { emitted } = await runRule(missingModelRule, {
      path: "prompts/no-loc.prompt.md",
      body: "Hi {{ x }}",
      frontmatter: {},
    })
    expect(emitted[0]?.location).toBeUndefined()
  })
})
