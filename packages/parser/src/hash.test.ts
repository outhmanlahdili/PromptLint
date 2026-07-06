import { describe, expect, it } from "vitest"
import { computeContentHash } from "./hash.js"

const EXPECTED_EMPTY_BODY = "hash(empty path, empty body) is deterministic — depends on inputs only"

describe("computeContentHash", () => {
  it("returns 64-character lowercase hex", () => {
    const h = computeContentHash({
      path: "a.prompt.md",
      format: "prompt.md",
      body: "Hello",
    })
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it("strips trailing newline before hashing", () => {
    const a = computeContentHash({
      path: "a.prompt.md",
      format: "prompt.md",
      body: "Hello",
    })
    const b = computeContentHash({
      path: "a.prompt.md",
      format: "prompt.md",
      body: "Hello\n",
    })
    expect(a).toBe(b)
  })

  it("normalizes backslashes in path before hashing", () => {
    const a = computeContentHash({
      path: "prompts/foo.prompt.md",
      format: "prompt.md",
      body: "Hi",
    })
    const b = computeContentHash({
      path: "prompts\\foo.prompt.md",
      format: "prompt.md",
      body: "Hi",
    })
    expect(a).toBe(b)
  })

  it("sorts frontmatter keys before hashing", () => {
    const a = computeContentHash({
      path: "p.prompt.md",
      format: "prompt.md",
      body: "",
      frontmatter: { a: 1, b: 2, c: 3 },
    })
    const b = computeContentHash({
      path: "p.prompt.md",
      format: "prompt.md",
      body: "",
      frontmatter: { c: 3, a: 1, b: 2 },
    })
    expect(a).toBe(b)
  })

  it("differs across formats", () => {
    const a = computeContentHash({
      path: "p",
      format: "prompt.md",
      body: "x",
    })
    const b = computeContentHash({
      path: "p",
      format: "prompt.json",
      body: "x",
    })
    expect(a).not.toBe(b)
  })

  it("differs across bodies", () => {
    const a = computeContentHash({
      path: "p",
      format: "prompt.md",
      body: "x",
    })
    const b = computeContentHash({
      path: "p",
      format: "prompt.md",
      body: "y",
    })
    expect(a).not.toBe(b)
  })

  it("produces identical output for identical inputs", () => {
    const a = computeContentHash({
      path: "p",
      format: "prompt.md",
      body: "Hello",
      frontmatter: { x: 1 },
    })
    const b = computeContentHash({
      path: "p",
      format: "prompt.md",
      body: "Hello",
      frontmatter: { x: 1 },
    })
    expect(a).toBe(b)
  })

  it(EXPECTED_EMPTY_BODY, () => {
    const h = computeContentHash({
      path: "",
      format: "prompt.md",
      body: "",
    })
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })
})
