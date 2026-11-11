import { describe, expect, it } from "vitest";
import type { Finding } from "@/server/domain/types";
import { type BreachProvider, ProviderError } from "@/server/providers/types";
import { runSearch } from "./search-service";

const exposure: Finding = {
  kind: "breach",
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
    expect(result.findings).toEqual([exposure]);
    expect(result.failedProviders).toEqual(["broken"]);
    expect(result.queriedProviders).toEqual(["ok", "broken"]);
  });

  it("stops a provider that is too slow", async () => {
    const result = await runSearch({ email: "x@example.com" }, [okProvider, slowProvider], 50);
    expect(result.findings).toHaveLength(1);
    expect(result.failedProviders).toEqual(["slow"]);
  });

  it("applies the enrichment step and keeps the results if it fails", async () => {
    const tagged = await runSearch({ email: "x@example.com" }, [okProvider], 1000, async (f) =>
      f.map((x) => ({ ...x, source: "enriched" }) as Finding),
    );
    expect(tagged.findings[0]).toMatchObject({ source: "enriched" });

    const failing = await runSearch({ email: "x@example.com" }, [okProvider], 1000, async () => {
      throw new Error("down");
    });
    expect(failing.findings).toEqual([exposure]);
  });

  it("skips providers that do not support the query", async () => {
    const result = await runSearch({}, [okProvider]);
    expect(result).toEqual({ findings: [], queriedProviders: [], failedProviders: [] });
  });
});
