import { describe, expect, it } from "vitest"
import { createIgnoreMatcher } from "./matchers.ts"

describe("createIgnoreMatcher", () => {
  it("matches a simple double-star directory glob", () => {
    const isMatch = createIgnoreMatcher(["dist/**"])
    expect(isMatch("dist/foo/bar.prompt.md")).toBe(true)
    expect(isMatch("dist/foo.prompt.md")).toBe(true)
    expect(isMatch("src/main.prompt.md")).toBe(false)
  })

  it("matches absolute paths so users can write relative glob patterns", () => {
    const isMatch = createIgnoreMatcher(["dist/**"])
    expect(isMatch("C:/repo/dist/foo.prompt.md")).toBe(true)
    expect(isMatch("/home/user/repo/dist/foo.prompt.md")).toBe(true)
    expect(isMatch("C:/repo/src/foo.prompt.md")).toBe(false)
  })

  it("matches the same directory at any depth (e.g. nested repos)", () => {
    const isMatch = createIgnoreMatcher(["coverage/**"])
    expect(isMatch("coverage/x.prompt.md")).toBe(true)
    expect(isMatch("a/b/coverage/x.prompt.md")).toBe(true)
    expect(isMatch("a/b/coverage/nested/x.prompt.md")).toBe(true)
    expect(isMatch("a/b/c/x.prompt.md")).toBe(false)
  })

  it("returns false on an empty pattern list", () => {
    const isMatch = createIgnoreMatcher([])
    expect(isMatch("anything/here.prompt.md")).toBe(false)
  })

  it("returns false on an empty path", () => {
    const isMatch = createIgnoreMatcher(["dist/**"])
    expect(isMatch("")).toBe(false)
  })

  it("ignores empty or whitespace-only patterns", () => {
    const isMatch = createIgnoreMatcher(["", "  ", "dist/**"])
    expect(isMatch("dist/x.prompt.md")).toBe(true)
    expect(isMatch("src/x.prompt.md")).toBe(false)
  })

  it("normalizes Windows back-slashes to forward slashes", () => {
    const isMatch = createIgnoreMatcher(["dist/**"])
    expect(isMatch("dist\\foo\\bar.prompt.md")).toBe(true)
    expect(isMatch("C:\\repo\\dist\\foo.prompt.md")).toBe(true)
  })

  it("supports an exact-name glob", () => {
    const isMatch = createIgnoreMatcher(["generated/**"])
    expect(isMatch("generated/foo.prompt.md")).toBe(true)
    expect(isMatch("a/generated/foo.prompt.md")).toBe(true)
    expect(isMatch("other/foo.prompt.md")).toBe(false)
  })

  it("supports patterns at multiple depths", () => {
    const isMatch = createIgnoreMatcher(["dist/**", "build/**", "generated/**"])
    expect(isMatch("dist/x.prompt.md")).toBe(true)
    expect(isMatch("build/x.prompt.md")).toBe(true)
    expect(isMatch("generated/x.prompt.md")).toBe(true)
    expect(isMatch("src/x.prompt.md")).toBe(false)
  })

  it("ignores a leading slash in the absolute path", () => {
    const isMatch = createIgnoreMatcher(["dist/**"])
    expect(isMatch("/dist/x.prompt.md")).toBe(true)
  })
})
