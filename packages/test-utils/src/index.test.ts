import { describe, expect, it } from "vitest"
import { makePromptFile } from "./index.ts"

describe("makePromptFile", () => {
  it("normalizes backslashes in path to forward slashes", () => {
    const file = makePromptFile({
      path: "prompts\\foo.prompt.md",
      format: "prompt.md",
      body: "Hello.",
    })
    expect(file.path).toBe("prompts/foo.prompt.md")
    expect(file.id).toBe("prompts/foo.prompt.md")
  })

  it("returns a stable contentHash for the same inputs", () => {
    const a = makePromptFile({
      path: "prompts/foo.prompt.md",
      format: "prompt.md",
      body: "Hello.",
    })
    const b = makePromptFile({
      path: "prompts/foo.prompt.md",
      format: "prompt.md",
      body: "Hello.",
    })
    expect(a.contentHash).toBe(b.contentHash)
  })

  it("returns a different contentHash when the body changes", () => {
    const a = makePromptFile({
      path: "prompts/foo.prompt.md",
      format: "prompt.md",
      body: "Hello.",
    })
    const b = makePromptFile({
      path: "prompts/foo.prompt.md",
      format: "prompt.md",
      body: "Hello!",
    })
    expect(a.contentHash).not.toBe(b.contentHash)
  })

  it("returns a frozen object", () => {
    const file = makePromptFile({
      path: "prompts/foo.prompt.md",
      format: "prompt.md",
      body: "Hello.",
    })
    expect(Object.isFrozen(file)).toBe(true)
  })
})
