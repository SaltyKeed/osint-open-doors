import { describe, expect, it, vi } from "vitest";
import type { Exposure } from "@/server/domain/types";
import type { BreachProvider } from "@/server/providers/types";
import { searchAll } from "./search-service";

const exposure = (providerId: string): Exposure => ({
  providerId,
  source: "ExampleShop",
  domain: null,
  year: null,
  categories: ["email"],
  recordCount: null,
  verified: true,
});

const fake = (id: string, search: BreachProvider["search"], supports: BreachProvider["supports"] = ["email"]) => ({
  id,
  supports,
  search: vi.fn(search),
});

const query = { email: "jean@exemple.ch" };

describe("searchAll", () => {
  it("merges exposures from all providers", async () => {
    const result = await searchAll(query, [
      fake("a", async () => [exposure("a")]),
      fake("b", async () => [exposure("b")]),
    ]);
    expect(result).toEqual({ exposures: [exposure("a"), exposure("b")], failedProviders: [] });
  });

  it("lists a throwing provider in failedProviders and keeps the others", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await searchAll(query, [
      fake("broken", async () => {
        throw new Error("broken: HTTP 500");
      }),
      fake("ok", async () => [exposure("ok")]),
    ]);
    expect(result).toEqual({ exposures: [exposure("ok")], failedProviders: ["broken"] });
  });

  it("skips providers that do not support the query kinds", async () => {
    const phoneOnly = fake("phone", async () => [exposure("phone")], ["phone"]);
    const result = await searchAll(query, [phoneOnly]);
    expect(phoneOnly.search).not.toHaveBeenCalled();
    expect(result).toEqual({ exposures: [], failedProviders: [] });
  });

  it("fails a provider that exceeds the timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const slow = fake(
      "slow",
      (_query, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    );
    expect(await searchAll(query, [slow], 50)).toEqual({ exposures: [], failedProviders: ["slow"] });
  });

  it("logs the provider id only, never the error message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await searchAll(query, [
      fake("broken", async () => {
        throw new Error("jean@exemple.ch");
      }),
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("jean");
  });
});
