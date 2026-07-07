import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import highTokenEstimateRule from "./high-token-estimate.ts"

describe("cost/high-token-estimate", () => {
  it("does not report when the default threshold is not exceeded", async () => {
    const body = "Hello, world."
    const { emitted } = await runRule(highTokenEstimateRule, {
      path: "prompts/short.prompt.md",
      body,
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("does not report for an empty prompt body", async () => {
    const { emitted } = await runRule(highTokenEstimateRule, {
      path: "prompts/empty.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("reports when the body exceeds the default threshold", async () => {
    const body =
      "This is a long prompt body that we expect to exceed the configured token ceiling. ".repeat(
        200,
      )
    const { emitted } = await runRule(highTokenEstimateRule, {
      path: "prompts/long.prompt.md",
      body,
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    const message = emitted[0]?.message ?? ""
    expect(message).toMatch(/tokens/i)
    expect(message).toMatch(/2000/)
  })

  it("respects a custom `maxTokens` option", async () => {
    const body = "One two three four five."
    const { emitted } = await runRule(
      highTokenEstimateRule,
      {
        path: "prompts/custom.prompt.md",
        body,
        frontmatter: {},
      },
      { maxTokens: 2 },
    )
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toMatch(/2\b/)
  })

  it("a boundary case exactly meeting the threshold does not fire", async () => {
    const body = "hello"
    const { emitted } = await runRule(
      highTokenEstimateRule,
      {
        path: "prompts/boundary.prompt.md",
        body,
        frontmatter: {},
      },
      { maxTokens: 2 },
    )
    expect(emitted).toHaveLength(0)
  })

  it("a non-positive `maxTokens` disables the rule", async () => {
    const body = "hello world this is another long sentence"
    const { emitted } = await runRule(
      highTokenEstimateRule,
      {
        path: "prompts/zero.prompt.md",
        body,
        frontmatter: {},
      },
      { maxTokens: 0 },
    )
    expect(emitted).toHaveLength(0)
  })

  it("bad option types fall back to the default `2000`", async () => {
    const body = "x".repeat(200)
    const { emitted } = await runRule(
      highTokenEstimateRule,
      {
        path: "prompts/bad.prompt.md",
        body,
        frontmatter: {},
      },
      { maxTokens: "not-a-number" as unknown as number },
    )
    // 200 chars ~= 50 tokens; far below 2000; expect zero findings.
    expect(emitted).toHaveLength(0)
  })

  it("emits a single finding regardless of how many times the threshold is exceeded", async () => {
    const body = "a b c d e f g h i j k l m n o p q r s t u v w x y z ".repeat(500)
    const { emitted } = await runRule(highTokenEstimateRule, {
      path: "prompts/large.prompt.md",
      body,
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("defaults to `warning` severity", () => {
    expect(highTokenEstimateRule.defaultSeverity).toBe("warning")
  })

  it("exposes `maxTokens` in its declared options", () => {
    expect(highTokenEstimateRule.options?.find((o) => o.name === "maxTokens")?.default).toBe(2000)
  })

  it("supports unicode body content", async () => {
    const body = "你好世界 ".repeat(300)
    const { emitted } = await runRule(
      highTokenEstimateRule,
      {
        path: "prompts/unicode.prompt.md",
        body,
        frontmatter: {},
      },
      { maxTokens: 50 },
    )
    expect(emitted).toHaveLength(1)
  })

  it("pure whitespace body does not trip the rule", async () => {
    const { emitted } = await runRule(
      highTokenEstimateRule,
      {
        path: "prompts/blank.prompt.md",
        body: "   \n\t   ",
        frontmatter: {},
      },
      { maxTokens: 1 },
    )
    expect(emitted).toHaveLength(0)
  })
})
