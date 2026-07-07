import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import filenameNamingRule from "./filename-naming.ts"

describe("convention/filename-naming", () => {
  it("passes canonical kebab-case paths", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/greet-user.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("reports camelCase paths", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/GreetUser.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("GreetUser")
    expect(emitted[0]?.suggestions?.[0]).toMatch(/greet-user\.prompt\.md/)
  })

  it("reports snake_case paths", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/greet_user.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("reports spaces in filenames", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/greet user.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.suggestions?.[0]).toContain("greet-user.prompt.md")
  })

  it("reports PascalCase without hyphens", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "PromptsWithoutHyphens.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("PromptsWithoutHyphens")
  })

  it("reports a leading hyphen", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/-leading.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("reports a trailing hyphen", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/trailing-.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("reports double hyphens", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/double--hyphen.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("accepts purely numeric segments (e.g. e2e-001)", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/e2e-001.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("accepts single word lowercase names", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/summarize.prompt.md",
      body: "Hello.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("handles deeply nested directories", async () => {
    const a = await runRule(filenameNamingRule, {
      path: "examples/prompts/team/greet.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(a.emitted).toHaveLength(0)
    const b = await runRule(filenameNamingRule, {
      path: "examples/prompts/Team/Greet.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(b.emitted).toHaveLength(1)
  })

  it("the message reports the basename only and suggests a fix", async () => {
    const { emitted } = await runRule(filenameNamingRule, {
      path: "prompts/My-Prompt.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("`My-Prompt`")
    expect(emitted[0]?.suggestions?.[0]).toContain("my-prompt.prompt.md")
  })

  it("returns a deterministic finding", async () => {
    const a = await runRule(filenameNamingRule, {
      path: "prompts/Bad.prompt.md",
      body: "",
      frontmatter: {},
    })
    const b = await runRule(filenameNamingRule, {
      path: "prompts/Bad.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(a.emitted[0]?.message).toBe(b.emitted[0]?.message)
  })

  it("default severity is `info`", () => {
    expect(filenameNamingRule.defaultSeverity).toBe("info")
  })
})
