import { describe, expect, it } from "vitest";
import type { Finding } from "@promptlint/types";
import { serializeJson, toJsonPayload } from "./index.ts";

const baseFinding: Finding = {
  ruleId: "structure/missing-model",
  fileId: "prompts/foo.prompt.md",
  filePath: "prompts/foo.prompt.md",
  severity: "warning",
  message: "Add a model field.",
};

describe("toJsonPayload", () => {
  it("emits schemaVersion 1", () => {
    const payload = toJsonPayload([], new Date("2026-01-01T00:00:00Z"));
    expect(payload.schemaVersion).toBe(1);
    expect(payload.generatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("preserves findings verbatim", () => {
    const payload = toJsonPayload([baseFinding]);
    expect(payload.findings).toEqual([baseFinding]);
  });
});

describe("serializeJson", () => {
  it("emits valid JSON without trailing newline", () => {
    const payload = toJsonPayload([], new Date("2026-01-01T00:00:00Z"));
    const out = serializeJson(payload);
    expect(out.endsWith("\n")).toBe(false);
    expect(JSON.parse(out)).toEqual(payload);
  });

  it("is deterministic for the same input", () => {
    const a = serializeJson(toJsonPayload([baseFinding]));
    const b = serializeJson(toJsonPayload([baseFinding]));
    expect(a).toBe(b);
  });
});
