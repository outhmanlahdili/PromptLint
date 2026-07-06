import { describe, expect, it } from "vitest"
import { derivePromptId } from "./index.ts"

describe("derivePromptId", () => {
  it("normalizes backslashes to forward slashes", () => {
    expect(derivePromptId("foo\\bar\\baz.prompt.md")).toBe("foo/bar/baz.prompt.md")
  })

  it("is idempotent on already-normalized paths", () => {
    expect(derivePromptId("foo/bar/baz.prompt.md")).toBe("foo/bar/baz.prompt.md")
  })
})
