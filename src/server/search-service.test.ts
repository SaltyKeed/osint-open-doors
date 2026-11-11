import { describe, expect, it } from "vitest";
import type { Exposure } from "@/server/domain/types";
import { type BreachProvider, ProviderError } from "@/server/providers/types";
import { runSearch } from "./search-service";

const exposure: Exposure = {
  providerId: "ok",
  source: "ExampleShop",
  categories: ["email"],
  matchedOn: "email",
};

const okProvider: BreachProvider = {
  id: "ok",
  tier: "surface",
  supports: ["email"],
  search: async () => [exposure],
};

const failingProvider: BreachProvider = {
  id: "broken",
  tier: "surface",
  supports: ["email"],
  search: async () => {
    throw new ProviderError("broken", 500);
  },
};

const slowProvider: BreachProvider = {
  id: "slow",
  tier: "surface",
  supports: ["email"],
  search: (_query, signal) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new ProviderError("slow", "timeout")));
    }),
};

describe("runSearch", () => {
  it("keeps the results of working providers when another one fails", async () => {
    const result = await runSearch({ email: "x@example.com" }, [okProvider, failingProvider]);
    expect(result.exposures).toEqual([exposure]);
    expect(result.failedProviders).toEqual(["broken"]);
  });

  it("stops a provider that is too slow", async () => {
    const result = await runSearch({ email: "x@example.com" }, [okProvider, slowProvider], 50);
    expect(result.exposures).toHaveLength(1);
    expect(result.failedProviders).toEqual(["slow"]);
  });

  it("skips providers that do not support the query", async () => {
    const result = await runSearch({}, [okProvider]);
    expect(result).toEqual({ exposures: [], failedProviders: [] });
  });
});
