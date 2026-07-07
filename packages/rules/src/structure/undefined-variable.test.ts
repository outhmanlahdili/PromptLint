import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import undefinedVariableRule from "./undefined-variable.ts"

describe("structure/undefined-variable", () => {
  it("flags variables used in the body but never declared", async () => {
    const { emitted } = await runRule(undefinedVariableRule, {
      path: "prompts/unknown.prompt.md",
      body: "Hi {{ user }}",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("`user`")
    expect(emitted[0]?.severity).toBe("error")
    expect(emitted[0]?.location?.line).toBe(1)
  })

  it("does not flag variables declared in frontmatter", async () => {
    const { emitted } = await runRule(undefinedVariableRule, {
      path: "prompts/known.prompt.md",
      body: "Hi {{ user }}",
      frontmatter: { variables: ["user"] },
    })
    expect(emitted).toHaveLength(0)
  })

  it("supports unicode and dashed variable names", async () => {
    const { emitted } = await runRule(undefinedVariableRule, {
      path: "prompts/unicode.prompt.md",
      body: "Hi {{ user-name }}",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("`user-name`")
  })

  it("emits several findings when several variables are missing", async () => {
    const { emitted } = await runRule(undefinedVariableRule, {
      path: "prompts/many.prompt.md",
      body: "{{ a }} {{ b }}",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(2)
    expect(emitted[0]?.message).toContain("`a`")
    expect(emitted[1]?.message).toContain("`b`")
  })

  it("returns zero findings for an empty prompt", async () => {
    const { emitted } = await runRule(undefinedVariableRule, {
      path: "prompts/empty.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("default severity is `error`", () => {
    expect(undefinedVariableRule.defaultSeverity).toBe("error")
  })

  it("supports dotted variable paths", async () => {
    const { emitted } = await runRule(undefinedVariableRule, {
      path: "prompts/dot.prompt.md",
      body: "Hello {{ user.firstName }}",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("`user.firstName`")
  })

  it("no duplicates when the same variable appears multiple times", async () => {
    const { emitted } = await runRule(undefinedVariableRule, {
      path: "prompts/dup.prompt.md",
      body: "{{ x }}\n{{ x }}",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.location?.line).toBe(1)
  })
})
