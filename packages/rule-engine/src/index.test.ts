import type { RuleDefinition } from "@promptlint/types"
import { describe, expect, it } from "vitest"
import { declaredOptions, resolveSeverity } from "./index.ts"

const makeRule = (overrides: Partial<RuleDefinition> = {}): RuleDefinition => ({
  id: "quality/example-rule",
  description: "Example rule for tests.",
  defaultSeverity: "warning",
  check: () => ({ findings: [] }),
  ...overrides,
})

describe("resolveSeverity", () => {
  it("returns the rule's default severity when no override is supplied", () => {
    expect(resolveSeverity(makeRule(), undefined)).toBe("warning")
  })

  it("returns the override when supplied", () => {
    const override = { "quality/example-rule": "error" } as const
    expect(resolveSeverity(makeRule(), override)).toBe("error")
  })

  it("returns null when the rule is disabled", () => {
    const override = { "quality/example-rule": "off" } as const
    expect(resolveSeverity(makeRule(), override)).toBeNull()
  })
})

describe("declaredOptions", () => {
  it("returns an empty array when the rule declares no options", () => {
    expect(declaredOptions(makeRule())).toEqual([])
  })

  it("returns the rule's declared options unchanged", () => {
    const rule = makeRule({
      options: [{ name: "threshold", type: "number", default: 100, description: "Threshold." }],
    })
    expect(declaredOptions(rule)).toHaveLength(1)
    expect(declaredOptions(rule)[0]?.name).toBe("threshold")
  })
})
