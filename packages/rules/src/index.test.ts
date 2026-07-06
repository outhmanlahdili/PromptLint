import { describe, expect, it } from "vitest";
import {
  RULES_MANIFEST,
  definedRuleIds,
  findManifestEntry,
} from "./index.ts";

describe("RULES_MANIFEST", () => {
  it("contains exactly ten entries", () => {
    expect(RULES_MANIFEST).toHaveLength(10);
  });

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
    ];
    expect(definedRuleIds().sort()).toEqual([...expected].sort());
  });

  it("has unique ids across the catalog", () => {
    const ids = definedRuleIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks every V1 rule as non-auto-fixable", () => {
    for (const entry of RULES_MANIFEST) {
      expect(entry.autoFixable).toBe(false);
    }
  });
});

describe("findManifestEntry", () => {
  it("returns the entry when the id is present", () => {
    const entry = findManifestEntry("quality/missing-output-schema");
    expect(entry?.category).toBe("quality");
    expect(entry?.severity).toBe("warning");
  });

  it("returns undefined when the id is unknown", () => {
    expect(findManifestEntry("does/not-exist")).toBeUndefined();
  });
});
