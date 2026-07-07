import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import piiPatternRule from "./pii-pattern.ts"

describe("security/pii-pattern", () => {
  it("does not report on a clean body", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/clean.prompt.md",
      body: "Hello there! Summarize the meeting notes.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("flags an email address", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/email.prompt.md",
      body: "Send a reminder to dev@example.com about the workshop.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("email")
    expect(emitted[0]?.severity).toBe("error")
    expect(emitted[0]?.location?.line).toBe(1)
  })

  it("flags a phone-shaped sequence", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/phone.prompt.md",
      body: "Call 555-867-5309 to confirm.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toMatch(/phone/i)
  })

  it("flags an SSN-shaped sequence", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/ssn.prompt.md",
      body: "Patient SSN: 123-45-6789 must remain confidential.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("SSN")
  })

  it("flags a credit-card-shaped number", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/cc.prompt.md",
      body: "Charge 4111 1111 1111 1111 tomorrow.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.message).toContain("credit-card")
  })

  it("flags multiple kinds in a single body", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/multi.prompt.md",
      body: "Email: foo@bar.com and 555-867-5309",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(2)
    const messages = emitted.map((e) => e.message).join("\n")
    expect(messages).toContain("email")
    expect(messages).toContain("phone")
  })

  it("emits a finding for each PII occurrence of the same kind", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/dup.prompt.md",
      body: "a@x.com and b@x.com and c@x.com",
      frontmatter: {},
    })
    expect(emitted.length).toBeGreaterThanOrEqual(2)
  })

  it("ignores unicode but latin-heavy bodies without obvious PII", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/unicode.prompt.md",
      body: "こんにちは、世界",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("default severity is `error`", () => {
    expect(piiPatternRule.defaultSeverity).toBe("error")
  })

  it("returns zero findings for an empty body", async () => {
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/empty.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("provides source locations accurate to the match", async () => {
    const body = "Line one.\nLine two has ssn 111-22-3333.\nLine three."
    const { emitted } = await runRule(piiPatternRule, {
      path: "prompts/loc.prompt.md",
      body,
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.location?.line).toBe(2)
    expect(emitted[0]?.location?.column).toBeGreaterThanOrEqual(1)
  })
})
