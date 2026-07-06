import { describe, expect, it } from "vitest";
import { SEVERITY_WEIGHT } from "./index.ts";
import type { Severity } from "./index.ts";

describe("SEVERITY_WEIGHT", () => {
  it("orders severities from least to most severe", () => {
    const severities: Severity[] = ["info", "warning", "error"];
    const weights = severities.map((s) => SEVERITY_WEIGHT[s]);
    expect(weights).toEqual([0, 1, 2]);
    expect(new Set(weights).size).toBe(3);
  });

  it("is frozen so consumers cannot mutate it", () => {
    expect(Object.isFrozen(SEVERITY_WEIGHT)).toBe(true);
  });
});
