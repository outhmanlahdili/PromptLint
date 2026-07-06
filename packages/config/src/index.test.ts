import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, promptlintConfigSchema } from "./index.ts";

describe("promptlintConfigSchema", () => {
  it("accepts an empty object", () => {
    const result = promptlintConfigSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects unknown top-level keys", () => {
    const result = promptlintConfigSchema.safeParse({ foo: 1 });
    expect(result.success).toBe(false);
  });

  it("accepts a valid reporter override", () => {
    const result = promptlintConfigSchema.parse({ reporter: "json" });
    expect(result.reporter).toBe("json");
  });

  it("rejects an invalid reporter value", () => {
    const result = promptlintConfigSchema.safeParse({ reporter: "yaml" });
    expect(result.success).toBe(false);
  });

  it("accepts a rule severity override", () => {
    const result = promptlintConfigSchema.parse({
      rules: { "quality/missing-output-schema": "error" },
    });
    expect(result.rules?.["quality/missing-output-schema"]).toBe("error");
  });
});

describe("DEFAULT_CONFIG", () => {
  it("uses the human reporter", () => {
    expect(DEFAULT_CONFIG.reporter).toBe("human");
  });

  it("is frozen", () => {
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true);
  });
});
