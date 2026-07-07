import { describe, expect, it } from "vitest"
import { runRule } from "../test-helpers.ts"
import missingOutputSchemaRule from "./missing-output-schema.ts"

describe("quality/missing-output-schema", () => {
  it("does not fire when frontmatter declares outputSchema", async () => {
    const { emitted } = await runRule(missingOutputSchemaRule, {
      path: "prompts/with-schema.prompt.md",
      body: "Respond with JSON.",
      frontmatter: { outputSchema: { type: "object" } },
    })
    expect(emitted).toHaveLength(0)
  })

  it("does not fire when there is no structured-data signal", async () => {
    const { emitted } = await runRule(missingOutputSchemaRule, {
      path: "prompts/free.prompt.md",
      body: "Write a friendly summary of the report.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("fires when body says JSON without outputSchema", async () => {
    const { emitted } = await runRule(missingOutputSchemaRule, {
      path: "prompts/json.prompt.md",
      body: "Return a JSON object with the user's first name and email.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]?.severity).toBe("warning")
    expect(emitted[0]?.message).toContain("outputSchema")
  })

  it("fires for `yaml` keyword", async () => {
    const { emitted } = await runRule(missingOutputSchemaRule, {
      path: "prompts/yaml.prompt.md",
      body: "Provide the result as yaml with the user's id and name.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("fires for `table` keyword (markdown table)", async () => {
    const { emitted } = await runRule(missingOutputSchemaRule, {
      path: "prompts/table.prompt.md",
      body: "Return a table of recent purchases with sku and total.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(1)
  })

  it("does not fire when frontmatter has outputSchema even if body never mentions structured output", async () => {
    const { emitted } = await runRule(missingOutputSchemaRule, {
      path: "prompts/schema-only.prompt.md",
      body: "Be helpful and concise.",
      frontmatter: { outputSchema: { type: "object" } },
    })
    expect(emitted).toHaveLength(0)
  })

  it("returns zero findings for an empty prompt", async () => {
    const { emitted } = await runRule(missingOutputSchemaRule, {
      path: "prompts/empty.prompt.md",
      body: "",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("does not fire on free-form text that mentions nothing structured", async () => {
    const { emitted } = await runRule(missingOutputSchemaRule, {
      path: "prompts/conversation.prompt.md",
      body: "Pretend to be a friendly customer-service agent and respond empathetically.",
      frontmatter: {},
    })
    expect(emitted).toHaveLength(0)
  })

  it("default severity is `warning`", () => {
    expect(missingOutputSchemaRule.defaultSeverity).toBe("warning")
  })
})
