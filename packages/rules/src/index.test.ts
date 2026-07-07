import { describe, expect, it } from "vitest"
import { RULES_MANIFEST, definedRuleIds, findManifestEntry, getImplementedRules } from "./index.ts"

describe("getImplementedRules", () => {
  it("returns ten rule definitions", () => {
    expect(getImplementedRules()).toHaveLength(10)
  })

  it("preserves the order defined by RULES_MANIFEST", () => {
    const ids = getImplementedRules().map((r) => r.id)
    expect(ids).toEqual([
      "structure/missing-model",
      "structure/missing-description",
      "structure/unused-variable",
      "structure/undefined-variable",
      "cost/high-token-estimate",
      "security/pii-pattern",
      "security/instruction-override-pattern",
      "quality/missing-output-schema",
      "quality/vague-quantifier-language",
      "convention/filename-naming",
    ])
  })

  it("each returned rule has a check function", () => {
    for (const rule of getImplementedRules()) {
      expect(typeof rule.check).toBe("function")
    }
  })

  it("the `high-token-estimate` rule exposes its `maxTokens` option", () => {
    const rule = getImplementedRules().find((r) => r.id === "cost/high-token-estimate")
    expect(rule?.options).toHaveLength(1)
    expect(rule?.options?.[0]?.name).toBe("maxTokens")
    expect(rule?.options?.[0]?.default).toBe(2000)
    expect(rule?.options?.[0]?.type).toBe("number")
  })

  it("rules without options declare an empty options array", () => {
    for (const rule of getImplementedRules()) {
      if (rule.id === "cost/high-token-estimate") continue
      expect(rule.options).toEqual([])
    }
  })

  it("the returned array is frozen at the top level", () => {
    const rules = getImplementedRules()
    expect(Object.isFrozen(rules)).toBe(true)
  })
})

describe("RULES_MANIFEST", () => {
  it("contains exactly ten entries", () => {
    expect(RULES_MANIFEST).toHaveLength(10)
  })

  it("contains every rule documented in the Phase-0 PRD", () => {
    const expected = [
      "structure/missing-model",
      "structure/missing-description",
      "structure/unused-variable",
      "structure/undefined-variable",
      "cost/high-token-estimate",
      "security/pii-pattern",
      "security/instruction-override-pattern",
      "quality/missing-output-schema",
      "quality/vague-quantifier-language",
      "convention/filename-naming",
    ]
    expect([...definedRuleIds()].sort()).toEqual([...expected].sort())
  })

  it("has unique ids across the catalog", () => {
    const ids = definedRuleIds()
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("marks every V1 rule as non-auto-fixable", () => {
    for (const entry of RULES_MANIFEST) {
      expect(entry.autoFixable).toBe(false)
    }
  })
})

describe("findManifestEntry", () => {
  it("returns the entry when the id is present", () => {
    const entry = findManifestEntry("quality/missing-output-schema")
    expect(entry?.category).toBe("quality")
    expect(entry?.severity).toBe("warning")
  })

  it("returns undefined when the id is unknown", () => {
    expect(findManifestEntry("does/not-exist")).toBeUndefined()
  })
})
