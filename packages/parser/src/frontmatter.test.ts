import { describe, expect, it } from "vitest"
import { extractFrontmatter, promptFrontmatterSchema, splitFrontmatter } from "./frontmatter.js"

describe("splitFrontmatter", () => {
  it("returns no-frontmatter result when file starts with body", () => {
    const r = splitFrontmatter("Hello\n---\nWorld")
    expect(r.hasFrontmatter).toBe(false)
  })

  it("returns no-frontmatter result when fence does not close", () => {
    const r = splitFrontmatter("---\nA: 1\n")
    expect(r.hasFrontmatter).toBe(false)
  })

  it("returns hasFrontmatter with body start at next line", () => {
    const r = splitFrontmatter("---\ndescription: hi\n---\nbody")
    expect(r.hasFrontmatter).toBe(true)
    const bodyStart = r.endOffset
    expect(bodyStart).toBeGreaterThan(0)
  })

  it("ignores leading BOM", () => {
    const r = splitFrontmatter("\uFEFF---\nA: 1\n---\nbody")
    expect(r.hasFrontmatter).toBe(true)
  })
})

describe("extractFrontmatter", () => {
  it("returns empty frontmatter when none is present", () => {
    const r = extractFrontmatter("Just a body.")
    expect(r.errors).toEqual([])
    expect(r.value).toEqual({})
  })

  it("returns validated frontmatter", () => {
    const source = [
      "---",
      "description: summarize",
      "model: gpt-4o-mini",
      "variables:",
      "  - x",
      "  - y",
      "---",
      "body",
    ].join("\n")
    const r = extractFrontmatter(source)
    expect(r.errors).toEqual([])
    expect(r.value).toEqual({
      description: "summarize",
      model: "gpt-4o-mini",
      variables: ["x", "y"],
    })
  })

  it("preserves unknown keys in extra", () => {
    const source = "---\naliases: [a, b]\ntags:\n  - prompt\n---\nbody"
    const r = extractFrontmatter(source)
    expect(r.errors).toEqual([])
    expect(r.value.extra).toEqual({ aliases: ["a", "b"], tags: ["prompt"] })
  })

  it("reports malformed YAML", () => {
    const source = '---\nfoo: "unterminated\n---\nbody'
    const r = extractFrontmatter(source)
    expect(r.errors.length).toBeGreaterThan(0)
  })

  it("reports schema validation failures for known keys", () => {
    const source = "---\ndescription: 42\n---\nbody"
    const r = extractFrontmatter(source)
    expect(r.errors.length).toBeGreaterThan(0)
  })
})

describe("promptFrontmatterSchema", () => {
  it("rejects non-string description", () => {
    const r = promptFrontmatterSchema.safeParse({ description: 42 })
    expect(r.success).toBe(false)
  })

  it("rejects empty description", () => {
    const r = promptFrontmatterSchema.safeParse({ description: "" })
    expect(r.success).toBe(false)
  })

  it("rejects non-array variables", () => {
    const r = promptFrontmatterSchema.safeParse({ variables: "not-an-array" })
    expect(r.success).toBe(false)
  })

  it("accepts a clean frontmatter", () => {
    const r = promptFrontmatterSchema.safeParse({
      description: "ok",
      model: "gpt-4o",
      variables: ["a", "b"],
      outputSchema: { type: "object" },
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.description).toBe("ok")
    }
  })
})
