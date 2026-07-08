import { describe, expect, it } from "vitest"
import {
  DEFAULT_CONFIG,
  promptlintConfigSchema,
  ruleConfigSchema,
  ruleSeveritySchema,
} from "./index.ts"

describe("ruleSeveritySchema", () => {
  it.each(["off", "info", "warning", "error"] as const)("accepts %s", (value) => {
    expect(ruleSeveritySchema.parse(value)).toBe(value)
  })

  it("rejects unknown severity values", () => {
    const result = ruleSeveritySchema.safeParse("fatal")
    expect(result.success).toBe(false)
  })
})

describe("ruleConfigSchema", () => {
  it("accepts a short-form severity string", () => {
    const result = ruleConfigSchema.parse("warning")
    expect(result).toBe("warning")
  })

  it("accepts a long-form object with severity only", () => {
    const result = ruleConfigSchema.parse({ severity: "error" })
    expect(result).toEqual({ severity: "error" })
  })

  it("accepts a long-form object with options only", () => {
    const result = ruleConfigSchema.parse({ options: { maxTokens: 1500 } })
    expect(result).toEqual({ options: { maxTokens: 1500 } })
  })

  it("accepts a long-form object with both severity and options", () => {
    const result = ruleConfigSchema.parse({
      severity: "warning",
      options: { maxTokens: 4000 },
    })
    expect(result).toEqual({ severity: "warning", options: { maxTokens: 4000 } })
  })

  it("accepts a long-form object with neither severity nor options", () => {
    const result = ruleConfigSchema.parse({})
    expect(result).toEqual({})
  })

  it("accepts 'off' in both forms", () => {
    expect(ruleConfigSchema.parse("off")).toBe("off")
    expect(ruleConfigSchema.parse({ severity: "off" })).toEqual({ severity: "off" })
  })

  it("rejects an invalid severity inside the object form", () => {
    const result = ruleConfigSchema.safeParse({ severity: "fatal" })
    expect(result.success).toBe(false)
  })

  it("rejects an object with unknown keys", () => {
    const result = ruleConfigSchema.safeParse({ severity: "warning", foo: 1 })
    expect(result.success).toBe(false)
  })
})

describe("promptlintConfigSchema", () => {
  it("accepts an empty object", () => {
    const result = promptlintConfigSchema.parse({})
    expect(result).toEqual({})
  })

  it("rejects unknown top-level keys", () => {
    const result = promptlintConfigSchema.safeParse({ foo: 1 })
    expect(result.success).toBe(false)
  })

  it("accepts a failOn override", () => {
    const result = promptlintConfigSchema.parse({ failOn: "error" })
    expect(result.failOn).toBe("error")
  })

  it("accepts a format override", () => {
    const result = promptlintConfigSchema.parse({ format: "json" })
    expect(result.format).toBe("json")
  })

  it("accepts an ignore array", () => {
    const result = promptlintConfigSchema.parse({ ignore: ["dist/**", "coverage/**"] })
    expect(result.ignore).toEqual(["dist/**", "coverage/**"])
  })

  it("accepts a full document", () => {
    const result = promptlintConfigSchema.parse({
      failOn: "warning",
      format: "human",
      ignore: ["dist/**"],
      rules: {
        "structure/missing-model": "off",
        "cost/high-token-estimate": {
          severity: "warning",
          options: { maxTokens: 4000 },
        },
      },
    })
    expect(result).toEqual({
      failOn: "warning",
      format: "human",
      ignore: ["dist/**"],
      rules: {
        "structure/missing-model": "off",
        "cost/high-token-estimate": {
          severity: "warning",
          options: { maxTokens: 4000 },
        },
      },
    })
  })

  it("rejects an invalid failOn value", () => {
    const result = promptlintConfigSchema.safeParse({ failOn: "info" })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid format value", () => {
    const result = promptlintConfigSchema.safeParse({ format: "yaml" })
    expect(result.success).toBe(false)
  })

  it("rejects non-string ignore entries", () => {
    const result = promptlintConfigSchema.safeParse({ ignore: ["ok", 42] })
    expect(result.success).toBe(false)
  })

  it("rejects a rule with both short- and long-form value types mixed", () => {
    // Strings are accepted; objects with unknown keys are rejected.
    expect(promptlintConfigSchema.safeParse({ rules: { "a/b": "off" } }).success).toBe(true)
    expect(
      promptlintConfigSchema.safeParse({ rules: { "a/b": { severity: "warning", foo: 1 } } })
        .success,
    ).toBe(false)
  })
})

describe("DEFAULT_CONFIG", () => {
  it("uses 'warning' as the default failOn", () => {
    expect(DEFAULT_CONFIG.failOn).toBe("warning")
  })

  it("uses 'human' as the default format", () => {
    expect(DEFAULT_CONFIG.format).toBe("human")
  })

  it("uses an empty ignore list by default", () => {
    expect(DEFAULT_CONFIG.ignore).toEqual([])
  })

  it("uses an empty rules map by default", () => {
    expect(DEFAULT_CONFIG.rules).toEqual({})
  })

  it("is frozen", () => {
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true)
  })
})
