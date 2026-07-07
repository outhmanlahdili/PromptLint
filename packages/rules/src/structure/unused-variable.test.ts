import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import unusedVariableRule from "./unused-variable.ts"

describe("structure/unused-variable", () => {
  it("flags each declared-but-unused variable exactly once", async () => {
    const { emitted } = await runRule(unusedVariableRule, {
      path: "prompts/unused.prompt.md",
      body: "Nothing references these vars.",
      frontmatter: { variables: ["alpha", "beta", "gamma"] },
    })
    expect(emitted).toHaveLength(3)
    expect(emitted.map((e) => e.message).sort()).toEqual(
      [
        "Declared variable `alpha` is never referenced in the prompt body.",
        "Declared variable `beta` is never referenced in the prompt body.",
        "Declared variable `gamma` is never referenced in the prompt body.",
      ].sort(),
    )
  })

  it("does not flag declared variables that are referenced", async () => {
    const { emitted } = await runRule(unusedVariableRule, {
      path: "prompts/referenced.prompt.md",
      body: "Hi {{ name }}",
      frontmatter: { variables: ["name"] },
    })
    expect(emitted).toHaveLength(0)
  })

  it("partially flags when only some declared vars are referenced", async () => {
    const { emitted } = await runRule(unusedVariableRule, {
      path: "prompts/mixed.prompt.md",
      body: "Hello {{ used }}",
      frontmatter: { variables: ["used", "ignored"] },
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("`ignored`")
  })

  it("does nothing when the prompt declares no variables", async () => {
    const { emitted } = await runRule(unusedVariableRule, {
      path: "prompts/none.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("supports unicode variable names without flagging them", async () => {
    const { emitted } = await runRule(unusedVariableRule, {
      path: "prompts/unicode.prompt.md",
      body: "Hi {{ üser_名前 }}",
      frontmatter: { variables: ["üser_名前", "unused"] },
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("`unused`")
  })

  it("collapses duplicate declarations into a single finding", async () => {
    const { emitted } = await runRule(unusedVariableRule, {
      path: "prompts/dup.prompt.md",
      body: "hi",
      frontmatter: { variables: ["x", "x", "x"] },
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("`x`")
  })

  it("default severity is `warning`", () => {
    expect(unusedVariableRule.defaultSeverity).toBe("warning")
  })

  it("emits a deterministic order based on declaration order", async () => {
    const { emitted } = await runRule(unusedVariableRule, {
      path: "prompts/order.prompt.md",
      body: "no matches here",
      frontmatter: { variables: ["first", "second", "third"] },
    })
    expect(emitted[0]?.message).toContain("`first`")
    expect(emitted[1]?.message).toContain("`second`")
    expect(emitted[2]?.message).toContain("`third`")
  })

  it("flags unused variables when body does not reference them", async () => {
    const { emitted } = await runRule(unusedVariableRule, {
      path: "prompts/loc.prompt.md",
      body: "prompt body without substitution",
      frontmatter: { variables: ["foo", "bar"] },
    })
    expect(emitted).toHaveLength(2)
  })
})
