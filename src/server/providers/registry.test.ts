import { describe, expect, it } from "vitest";
import { getActiveProviders } from "./registry";

const env = { APP_MODE: "surface" as const };

describe("getActiveProviders", () => {
  it("never activates a deep provider in surface mode (D10, rule 3)", () => {
    const providers = getActiveProviders("surface", env);
    expect(providers.length).toBeGreaterThan(0);
    expect(providers.every((p) => p.tier === "surface")).toBe(true);
  });

  it("registers every surface source, even without keys", () => {
    const ids = getActiveProviders("surface", env).map((p) => p.id);
    expect(ids).toEqual(["xposedornot", "tavily", "searchch", "github", "gravatar", "pgp", "rdap"]);
  });

  it("includes the surface providers in deep mode", () => {
    const ids = getActiveProviders("deep", { APP_MODE: "deep" }).map((p) => p.id);
    expect(ids).toContain("xposedornot");
  });
});
