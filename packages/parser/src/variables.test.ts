import { describe, expect, it } from "vitest"
import { collectVariables, scanVariables } from "./variables.js"

describe("scanVariables", () => {
  it("returns [] when there are no variables", () => {
    expect(scanVariables("hello world")).toEqual([])
  })

  it("finds a single mustache variable with no spaces", () => {
    const r = scanVariables("hello {{name}} world")
    expect(r).toHaveLength(1)
    expect(r[0]?.name).toBe("name")
  })

  it("trims spaces around the variable name", () => {
    const r = scanVariables("a {{  user_name  }} b")
    expect(r[0]?.name).toBe("user_name")
  })

  it("captures multiple variables in declaration order", () => {
    const r = scanVariables("{{a}} and {{b}} then {{c}}")
    expect(r.map((v) => v.name)).toEqual(["a", "b", "c"])
  })

  it("supports dashes and dots in variable names", () => {
    const r = scanVariables("{{ user.email }} {{ user-tz }}")
    expect(r.map((v) => v.name)).toEqual(["user.email", "user-tz"])
  })

  it("ignores filter pipe suffixes without consuming the body", () => {
    const r = scanVariables("{{ name | upper }}")
    expect(r[0]?.name).toBe("name")
  })

  it("records lines 1-indexed for multi-line bodies", () => {
    const r = scanVariables("a\nb\nc {{x}}\nd")
    expect(r[0]?.location.line).toBe(3)
  })

  it("returns no results for unterminated opener", () => {
    expect(scanVariables("opened {{ but never closed")).toEqual([])
  })

  it("returns no results for empty names", () => {
    expect(scanVariables("{{ }} and {{|}}")).toEqual([])
  })

  it("uses startOffset to compute higher line numbers", () => {
    const body = "x\n{{ name }}"
    const offset = 100
    const r = scanVariables(body, offset)
    expect(r[0]?.location.line).toBeGreaterThanOrEqual(2)
  })

  it("does not match single braces", () => {
    expect(scanVariables("a { b } c")).toEqual([])
    expect(scanVariables("a } b { c")).toEqual([])
  })
})

describe("collectVariables", () => {
  it("groups occurrences by name", () => {
    const occs = scanVariables("{{a}} and {{b}} and {{a}} again")
    const groups = collectVariables(occs)
    const a = groups.find((g) => g.name === "a")
    const b = groups.find((g) => g.name === "b")
    expect(a?.locations).toHaveLength(2)
    expect(b?.locations).toHaveLength(1)
  })

  it("preserves declared order", () => {
    const occs = scanVariables("{{z}} {{a}} {{m}}")
    const groups = collectVariables(occs)
    expect(groups.map((g) => g.name)).toEqual(["z", "a", "m"])
  })

  it("produces frozen objects", () => {
    const occs = scanVariables("{{a}}")
    const [group] = collectVariables(occs)
    expect(group === undefined || Object.isFrozen(group)).toBe(true)
    expect(group === undefined || Object.isFrozen(group.locations)).toBe(true)
  })
})
