import { describe, expect, it } from "vitest";
import { getActiveProviders } from "./registry";

describe("getActiveProviders", () => {
  it("never activates a deep provider in surface mode (D10, rule 3)", () => {
    const providers = getActiveProviders("surface");
    expect(providers.length).toBeGreaterThan(0);
    expect(providers.every((p) => p.tier === "surface")).toBe(true);
  });

  it("includes the surface providers in deep mode", () => {
    const ids = getActiveProviders("deep").map((p) => p.id);
    expect(ids).toContain("xposedornot");
  });
});
