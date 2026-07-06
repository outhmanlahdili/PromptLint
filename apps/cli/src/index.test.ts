import { describe, expect, it } from "vitest";

describe("@promptlint/cli (phase 0)", () => {
  it("ships an empty public surface", async () => {
    const mod = await import("./index.ts");
    expect(Object.keys(mod)).toEqual([]);
  });
});
