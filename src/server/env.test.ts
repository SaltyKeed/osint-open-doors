import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

// All values below are invented test data.

describe("loadEnv", () => {
  it("works without any key: every key is optional", () => {
    expect(loadEnv({})).toEqual({});
  });

  it("reads the GitHub token, without spaces around", () => {
    expect(loadEnv({ GITHUB_TOKEN: " github_pat_exemple123 " })).toEqual({ GITHUB_TOKEN: "github_pat_exemple123" });
  });

  it("treats an empty value (GITHUB_TOKEN=) as no token", () => {
    expect(loadEnv({ GITHUB_TOKEN: "" })).toEqual({});
  });

  it("reads the Tavily key", () => {
    expect(loadEnv({ TAVILY_API_KEY: "tvly-exemple123" })).toEqual({ TAVILY_API_KEY: "tvly-exemple123" });
  });

  it("reads the search.ch key, and none when it is empty", () => {
    expect(loadEnv({ SEARCH_CH_API_KEY: " cle-exemple123 " })).toEqual({ SEARCH_CH_API_KEY: "cle-exemple123" });
    expect(loadEnv({ SEARCH_CH_API_KEY: "" })).toEqual({});
  });

  it("rejects a malformed token without echoing its value", () => {
    expect(() => loadEnv({ GITHUB_TOKEN: "pas un jeton" })).toThrow("Invalid environment: GITHUB_TOKEN");
    expect(() => loadEnv({ GITHUB_TOKEN: "pas un jeton" })).not.toThrow(/jeton/);
  });
});
