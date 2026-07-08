import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "./defaults.ts"
import { mergeConfig } from "./merge.ts"
import type { PromptlintConfig } from "./schema.ts"

describe("mergeConfig", () => {
  it("returns defaults when given an empty user config", () => {
    const merged = mergeConfig({})
    expect(merged).toEqual(DEFAULT_CONFIG)
  })

  it("returns a fresh object every call (defensive copy of ignore/rules)", () => {
    const a = mergeConfig({})
    const b = mergeConfig({})
    expect(a).not.toBe(b)
    expect(a.rules).not.toBe(b.rules)
    expect(a.ignore).not.toBe(b.ignore)
  })

  it("applies user failOn when present", () => {
    const merged = mergeConfig({ failOn: "error" })
    expect(merged.failOn).toBe("error")
  })

  it("applies user format when present", () => {
    const merged = mergeConfig({ format: "json" })
    expect(merged.format).toBe("json")
  })

  it("replaces the ignore array with the user value", () => {
    const merged = mergeConfig({ ignore: ["dist/**", "build/**"] })
    expect(merged.ignore).toEqual(["dist/**", "build/**"])
  })

  it("defaults ignore to an empty array when omitted", () => {
    const merged = mergeConfig({ format: "json" })
    expect(merged.ignore).toEqual([])
  })

  it("shallow-merges user rules over the default empty map", () => {
    const userConfig: PromptlintConfig = {
      rules: {
        "structure/missing-model": "off",
        "cost/high-token-estimate": {
          severity: "warning",
          options: { maxTokens: 4000 },
        },
      },
    }
    const merged = mergeConfig(userConfig)
    expect(merged.rules).toEqual(userConfig.rules)
  })

  it("does not mutate DEFAULT_CONFIG", () => {
    const beforeRules = DEFAULT_CONFIG.rules
    const beforeIgnore = DEFAULT_CONFIG.ignore
    mergeConfig({
      ignore: ["a/**"],
      rules: { "x/y": "off" },
    })
    expect(DEFAULT_CONFIG.rules).toBe(beforeRules)
    expect(DEFAULT_CONFIG.ignore).toBe(beforeIgnore)
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true)
  })
})
