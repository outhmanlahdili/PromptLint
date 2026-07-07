import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import vagueQuantifierRule from "./vague-quantifier-language.ts"

describe("quality/vague-quantifier-language", () => {
  it("does not fire on a precise body", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/precise.prompt.md",
      body: "Reply with one of three concrete options: A, B, or C.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("flags 'a few'", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/few.prompt.md",
      body: "List a few suggestions for the user to consider.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message.toLowerCase()).toContain("a few")
  })

  it("flags 'etc.'", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/etc.prompt.md",
      body: "List the user's preferences (color, size, fit, etc.).",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("flags 'various'", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/various.prompt.md",
      body: "Mention various edge cases that might trip up the parser.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("flags 'and so on'", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/and-so-on.prompt.md",
      body: "Describe the steps alphabetically, one, two, three, and so on.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("emits multiple findings for multiple matches", async () => {
    const body = "Use a few examples, etc., and various categories."
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/multi.prompt.md",
      body,
      frontmatter: {},
    })
    expect(emitted.length).toBeGreaterThanOrEqual(3)
  })

  it("does not misfire when words appear inside larger tokens", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/noise.prompt.md",
      body: "fewer than ten users have reported this behavior.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("returns zero findings for empty body", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/empty.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("supports unicode bodies", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/unicode.prompt.md",
      body: "请描述几个关键步骤 etc.",
      frontmatter: {},
    })
    expect(emitted.length).toBeGreaterThanOrEqual(1)
  })

  it("default severity is `info`", () => {
    expect(vagueQuantifierRule.defaultSeverity).toBe("info")
  })

  it("provides a location for each match", async () => {
    const { emitted } = await runRule(vagueQuantifierRule, {
      path: "prompts/loc.prompt.md",
      body: "Use a few short lines.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.location?.line).toBe(1)
    expect(typeof emitted[0]?.location?.column).toBe("number")
  })
})
