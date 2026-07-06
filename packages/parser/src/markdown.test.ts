import { describe, expect, it } from "vitest"
import type { RawPromptInput } from "./index.js"
import { parseMarkdownPrompt } from "./markdown.js"

const FIXTURE_A = [
  "---",
  "description: Greet the user warmly.",
  "model: gpt-4o-mini",
  "variables:",
  "  - user",
  "  - tone",
  "---",
  "",
  "You are a helpful assistant. Respond to {{ user }} using a {{ tone }} tone.",
].join("\n")

const FIXTURE_B = "Just a plain body without any frontmatter."

const FIXTURE_C = [
  "---",
  "description: Summarize the article for {{ audience }}.",
  "---",
  "",
  "{{ article }}",
  "{{ audience }}",
].join("\n")

const FIXTURE_D = ["---", 'description: ""', "model: gpt-4o-mini", "---", "body"].join("\n")

function input(path: string, source: string): RawPromptInput {
  return Object.freeze({ path, format: "prompt.md", source })
}

describe("parseMarkdownPrompt", () => {
  it("parses a well-formed markdown prompt", () => {
    const r = parseMarkdownPrompt(input("prompts/greet.prompt.md", FIXTURE_A))
    expect(r.errors).toEqual([])
    expect(r.file.format).toBe("prompt.md")
    expect(r.file.id).toBe("prompts/greet.prompt.md")
    expect(r.file.path).toBe("prompts/greet.prompt.md")
    expect(r.file.body.startsWith("You are a helpful assistant.")).toBe(true)
    expect(r.file.frontmatter.description).toBe("Greet the user warmly.")
    expect(r.file.frontmatter.model).toBe("gpt-4o-mini")
    expect(r.file.frontmatter.variables).toEqual(["user", "tone"])
  })

  it("extracts variables with locations from the body", () => {
    const r = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_A))
    const names = new Set(r.file.variables.map((v) => v.name))
    expect(names).toEqual(new Set(["user", "tone"]))
    for (const v of r.file.variables) {
      expect(v.locations.length).toBeGreaterThan(0)
    }
  })

  it("handles missing frontmatter gracefully", () => {
    const r = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_B))
    expect(r.errors).toEqual([])
    expect(r.file.body).toBe("Just a plain body without any frontmatter.")
    expect(r.file.frontmatter).toEqual({})
    expect(r.file.variables).toEqual([])
  })

  it("captures variables from body and ignores unknown frontmatter key tokens", () => {
    const r = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_C))
    const names = new Set(r.file.variables.map((v) => v.name))
    // audience is referenced twice (descriptions + body), article once.
    expect(names).toEqual(new Set(["article", "audience"]))
    expect(names.size).toBe(2)
  })

  it("reports invalid frontmatter without aborting the parse", () => {
    const r = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_D))
    expect(r.errors.length).toBeGreaterThan(0)
    expect(r.file.body).toBe("body")
  })

  it("preserves unknown frontmatter keys in extra", () => {
    const src = "---\ndescription: ok\naliases: [a, b]\n---\nbody"
    const r = parseMarkdownPrompt(input("p.prompt.md", src))
    expect(r.errors).toEqual([])
    expect(r.file.frontmatter.extra).toEqual({ aliases: ["a", "b"] })
  })

  it("normalizes backslashes in paths", () => {
    const r = parseMarkdownPrompt(input("p\\sub\\greet.prompt.md", FIXTURE_A))
    expect(r.file.id).toBe("p/sub/greet.prompt.md")
  })

  it("strips leading blank lines from the body produced by frontmatter", () => {
    const r = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_A))
    expect(r.file.body.startsWith("You are a helpful assistant.")).toBe(true)
  })

  it("produces deterministic content hashes", () => {
    const a = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_A))
    const b = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_A))
    expect(a.file.contentHash).toBe(b.file.contentHash)
    expect(a.file.contentHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("differs on body changes", () => {
    const a = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_A))
    const srcB = FIXTURE_A.replace("helpful assistant", "concise assistant")
    const b = parseMarkdownPrompt(input("p.prompt.md", srcB))
    expect(a.file.contentHash).not.toBe(b.file.contentHash)
  })

  it("returns frozen structures", () => {
    const r = parseMarkdownPrompt(input("p.prompt.md", FIXTURE_A))
    expect(Object.isFrozen(r)).toBe(true)
    expect(Object.isFrozen(r.file)).toBe(true)
    expect(Object.isFrozen(r.file.frontmatter)).toBe(true)
    expect(Object.isFrozen(r.file.variables)).toBe(true)
    for (const v of r.file.variables) {
      expect(Object.isFrozen(v)).toBe(true)
    }
  })

  it("ignores BOM at file start", () => {
    const r = parseMarkdownPrompt(input("p.prompt.md", `\uFEFF${FIXTURE_A}`))
    expect(r.errors).toEqual([])
    expect(r.file.frontmatter.description).toBe("Greet the user warmly.")
  })
})
