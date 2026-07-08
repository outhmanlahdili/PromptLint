import { describe, expect, it } from "vitest"
import { resolveRules } from "./resolve.ts"

const KNOWN = new Set(["structure/missing-model", "cost/high-token-estimate"])

describe("resolveRules", () => {
  it("returns empty inputs when no rules block is provided", () => {
    const result = resolveRules(undefined, KNOWN)
    expect(result.ruleSeverity).toEqual({})
    expect(result.ruleOptions).toEqual({})
    expect(result.unknown).toEqual([])
  })

  it("translates a short-form severity for a known rule", () => {
    const result = resolveRules({ "structure/missing-model": "off" }, KNOWN)
    expect(result.ruleSeverity).toEqual({ "structure/missing-model": "off" })
    expect(result.unknown).toEqual([])
  })

  it("translates a long-form severity override for a known rule", () => {
    const result = resolveRules({ "structure/missing-model": { severity: "error" } }, KNOWN)
    expect(result.ruleSeverity).toEqual({ "structure/missing-model": "error" })
  })

  it("translates option overrides for a known rule", () => {
    const result = resolveRules(
      {
        "cost/high-token-estimate": {
          severity: "warning",
          options: { maxTokens: 4000 },
        },
      },
      KNOWN,
    )
    expect(result.ruleSeverity).toEqual({ "cost/high-token-estimate": "warning" })
    expect(result.ruleOptions).toEqual({ "cost/high-token-estimate": { maxTokens: 4000 } })
  })

  it("collects unknown rule ids without affecting known entries", () => {
    const result = resolveRules(
      {
        "totally/unknown-rule": "error",
        "structure/missing-model": "off",
      },
      KNOWN,
    )
    expect(result.ruleSeverity).toEqual({ "structure/missing-model": "off" })
    expect(result.unknown).toEqual([{ ruleId: "totally/unknown-rule", severity: "error" }])
  })

  it("captures both severity and options on an unknown rule reference", () => {
    const result = resolveRules(
      { "totally/unknown-rule": { severity: "warning", options: { threshold: 5 } } },
      KNOWN,
    )
    expect(result.ruleSeverity).toEqual({})
    expect(result.ruleOptions).toEqual({})
    expect(result.unknown).toEqual([
      { ruleId: "totally/unknown-rule", severity: "warning", options: { threshold: 5 } },
    ])
  })

  it("defaults severity on an unknown long-form reference to warning", () => {
    const result = resolveRules({ "totally/unknown-rule": { options: { x: 1 } } }, KNOWN)
    expect(result.unknown).toEqual([
      { ruleId: "totally/unknown-rule", severity: "warning", options: { x: 1 } },
    ])
  })

  it("does not mutate input option records", () => {
    const userOptions = { maxTokens: 4000 }
    const result = resolveRules(
      {
        "cost/high-token-estimate": {
          severity: "warning",
          options: userOptions,
        },
      },
      KNOWN,
    )
    // mutate the resolved output's frozen record of options
    const handed = result.ruleOptions["cost/high-token-estimate"]
    expect(handed).toEqual({ maxTokens: 4000 })
    expect(handed).not.toBe(userOptions)
    // ensure frozen
    expect(Object.isFrozen(result.ruleOptions)).toBe(true)
    expect(Object.isFrozen(result.ruleSeverity)).toBe(true)
  })
})
