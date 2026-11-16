import { describe, expect, it } from "vitest";
import { getActiveProviders } from "./registry";

const env = { APP_MODE: "surface" as const, USERNAME_GUESSES: 10 };

describe("getActiveProviders", () => {
  it("never activates a deep provider in surface mode (D10, rule 3)", () => {
    const providers = getActiveProviders("surface", env);
    expect(providers.length).toBeGreaterThan(0);
    expect(providers.every((p) => p.tier === "surface")).toBe(true);
  });

  it("registers every surface source, even without keys", () => {
    const ids = getActiveProviders("surface", env).map((p) => p.id);
    expect(ids).toEqual([
      "xposedornot", "leakcheck", "tavily", "searchch", "github", "gravatar", "pgp", "rdap",
      "whatsmyname", "profiles", "orcid", "wikidata", "shab",
    ]);
  });

  it("includes the surface providers in deep mode", () => {
    const ids = getActiveProviders("deep", { APP_MODE: "deep", USERNAME_GUESSES: 10 }).map((p) => p.id);
    expect(ids).toContain("xposedornot");
    expect(ids).toEqual(expect.arrayContaining(["hudsonrock", "ransomware"]));
  });

  it("never activates DeHashed in surface mode, even with its key (D10, rule 2)", () => {
    const withKey = { USERNAME_GUESSES: 10, DEHASHED_API_KEY: "test-key" };
    expect(getActiveProviders("surface", { ...withKey, APP_MODE: "surface" }).map((p) => p.id)).not.toContain("dehashed");
    expect(getActiveProviders("deep", { ...withKey, APP_MODE: "deep" }).map((p) => p.id)).toContain("dehashed");
  });

  it("asks LeakCheck with the phone number in deep mode only (D29)", () => {
    const leakcheck = (mode: "surface" | "deep") =>
      getActiveProviders(mode, { APP_MODE: mode, USERNAME_GUESSES: 10 }).find((p) => p.id === "leakcheck");
    expect(leakcheck("surface")?.supports).not.toContain("phone");
    expect(leakcheck("deep")?.supports).toContain("phone");
  });
});
