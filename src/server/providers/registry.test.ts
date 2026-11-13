import { describe, expect, it } from "vitest";
import { DEEP_PROVIDERS, getProviders } from "./registry";

describe("getProviders", () => {
  it("uses only the surface providers in surface mode", () => {
    expect(getProviders("surface").map((p) => p.id)).toEqual(["xposedornot"]);
    expect(getProviders("surface").some((p) => DEEP_PROVIDERS.includes(p))).toBe(false);
  });

  it("adds the deep providers to the surface ones in deep mode", () => {
    expect(getProviders("deep").map((p) => p.id)).toContain("xposedornot");
  });
});
