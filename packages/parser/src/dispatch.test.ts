import { describe, expect, it } from "vitest"
import { createParser, parsePrompt } from "./dispatch.js"

describe("parsePrompt", () => {
  it("returns a parse result for .prompt.md", async () => {
    const r = await parsePrompt({
      path: "greet.prompt.md",
      format: "prompt.md",
      source: "---\ndescription: hi\n---\nHello {{ name }}",
    })
    expect(r.errors).toEqual([])
    expect(r.file.format).toBe("prompt.md")
  })

  it("returns errors for unsupported formats", async () => {
    const r = await parsePrompt({
      path: "config.prompt.json",
      format: "prompt.json",
      source: "{}",
    })
    expect(r.errors.length).toBe(1)
    expect(r.errors[0]?.message).toContain("not yet implemented")
  })

  it("dispatcher mirrors parsers' id normalization", async () => {
    const r = await parsePrompt({
      path: "a\\b.prompt.md",
      format: "prompt.md",
      source: "body",
    })
    expect(r.file.id).toBe("a/b.prompt.md")
  })
})

describe("createParser", () => {
  it("creates a markdown parser", () => {
    const parser = createParser("prompt.md")
    expect(parser.format).toBe("prompt.md")
    const r = parser.parse({
      path: "g.prompt.md",
      format: "prompt.md",
      source: "body",
    })
    if (r instanceof Promise) {
      throw new Error("Markdown parser returned a Promise in Phase 1")
    }
    expect(r.file.body).toBe("body")
  })

  it("creates an unsupported parser for json in Phase 1", () => {
    const parser = createParser("prompt.json")
    const r = parser.parse({
      path: "g.prompt.json",
      format: "prompt.json",
      source: "{}",
    })
    if (r instanceof Promise) {
      throw new Error("Unsupported parser returned a Promise in Phase 1")
    }
    expect(r.errors.length).toBe(1)
    expect(r.file.body).toBe("")
  })

  it("creates an unsupported parser for ts in Phase 1", () => {
    const parser = createParser("prompt.ts")
    const r = parser.parse({
      path: "g.prompt.ts",
      format: "prompt.ts",
      source: "export default '';",
    })
    if (r instanceof Promise) {
      throw new Error("Unsupported parser returned a Promise in Phase 1")
    }
    expect(r.errors.length).toBeGreaterThan(0)
  })

  it("returns frozen parsers", () => {
    const parser = createParser("prompt.md")
    expect(Object.isFrozen(parser)).toBe(true)
  })
})
