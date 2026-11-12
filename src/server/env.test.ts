import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("defaults to surface when APP_MODE is missing", () => {
    expect(loadEnv({})).toEqual({ APP_MODE: "surface" });
  });

  it("accepts deep", () => {
    expect(loadEnv({ APP_MODE: "deep" })).toEqual({ APP_MODE: "deep" });
  });

  it("rejects an unknown mode without echoing its value", () => {
    expect(() => loadEnv({ APP_MODE: "prod" })).toThrow("Invalid environment: APP_MODE");
    expect(() => loadEnv({ APP_MODE: "prod" })).not.toThrow(/prod/);
  });
});
