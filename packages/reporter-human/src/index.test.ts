import { describe, expect, it } from "vitest";
import { SEVERITY_GLYPH, formatFindingsForHuman } from "./index.ts";
import type { Finding } from "@promptlint/types";

const finding: Finding = {
  ruleId: "quality/missing-output-schema",
  fileId: "prompts/summarize.prompt.md",
  filePath: "prompts/summarize.prompt.md",
  severity: "warning",
  message: "Expected an output schema in frontmatter.",
  location: { line: 1, column: 1, endLine: 1, endColumn: 10 },
};

describe("SEVERITY_GLYPH", () => {
  it("exposes one glyph per severity", () => {
    expect(Object.keys(SEVERITY_GLYPH).sort()).toEqual(["error", "info", "warning"]);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(SEVERITY_GLYPH)).toBe(true);
  });
});

describe("formatFindingsForHuman", () => {
  it("reports zero findings cleanly", () => {
    const output = formatFindingsForHuman({ findings: [] });
    expect(output).toContain("No findings.");
  });

  it("renders a finding with severity glyph and rule id", () => {
    const output = formatFindingsForHuman({ findings: [finding] });
    expect(output).toContain("⚠");
    expect(output).toContain("quality/missing-output-schema");
    expect(output).toContain("Expected an output schema in frontmatter.");
  });

  it("summarises the total count", () => {
    const output = formatFindingsForHuman({ findings: [finding, finding] });
    expect(output).toContain("Total: 2 findings.");
  });
});
