import { describe, expect, it } from "vitest"
import { parseYaml } from "./yaml.js"

describe("parseYaml", () => {
  it("returns empty mapping for empty source", () => {
    expect(parseYaml("")).toEqual({ value: {}, errors: [] })
  })

  it("parses simple scalars", () => {
    const result = parseYaml("description: Summarize the article below.\nmodel: gpt-4o-mini\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({
      description: "Summarize the article below.",
      model: "gpt-4o-mini",
    })
  })

  it("parses booleans and null", () => {
    const result = parseYaml("a: true\nb: false\nc: ~\nd: null\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ a: true, b: false, c: null, d: null })
  })

  it("parses numbers", () => {
    const result = parseYaml("i: 42\nf: -3.14\ne: 6.022e23\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ i: 42, f: -3.14, e: 6.022e23 })
  })

  it("parses double-quoted strings with escapes", () => {
    const result = parseYaml('greeting: "hello\\nworld"\n')
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ greeting: "hello\nworld" })
  })

  it("parses single-quoted strings", () => {
    const result = parseYaml("greeting: 'hi there'\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ greeting: "hi there" })
  })

  it("parses block sequences", () => {
    const result = parseYaml("items:\n  - a\n  - b\n  - c\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ items: ["a", "b", "c"] })
  })

  it("parses flow sequences", () => {
    const result = parseYaml("items: [a, b, c]\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ items: ["a", "b", "c"] })
  })

  it("parses flow mappings", () => {
    const result = parseYaml("meta: { model: gpt-4o, temperature: 0.2 }\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({
      meta: { model: "gpt-4o", temperature: 0.2 },
    })
  })

  it("marks duplicate keys as an error", () => {
    const result = parseYaml("a: 1\nb: 2\na: 3\n")
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("ignores comment-only lines", () => {
    const result = parseYaml("# top comment\na: 1\n# inline comment\nb: 2\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ a: 1, b: 2 })
  })

  it("applies baseLine offset to reported error locations", () => {
    const result = parseYaml("", 7)
    expect(result.errors).toEqual([])
  })

  it("ignores trailing whitespace", () => {
    const result = parseYaml("description: ok   \t\n")
    expect(result.errors).toEqual([])
    expect(result.value).toEqual({ description: "ok" })
  })
})
