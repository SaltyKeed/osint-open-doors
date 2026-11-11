import "server-only";
import { type BreachProvider, ProviderError } from "../types";
import { tavilySearch } from "./client";
import { PROVIDER_ID, type TavilyBatch, toFindings } from "./mapper";
import { tavilyResponseSchema } from "./schema";
import { plannedSearches } from "./searches";

export function createTavilyProvider(apiKey: string | undefined): BreachProvider {
  return {
    id: PROVIDER_ID,
    tier: "surface",
    supports: ["email", "phone", "name"],
    async search(query, signal) {
      if (!apiKey) throw new ProviderError(PROVIDER_ID, "missing-key");
      // All searches run in parallel; one failing search does not lose the others.
      const settled = await Promise.allSettled(
        plannedSearches(query).map(async ({ searchedOn, text, options }): Promise<TavilyBatch> => {
          const parsed = tavilyResponseSchema.safeParse(await tavilySearch(apiKey, text, options, signal));
          if (!parsed.success) throw new ProviderError(PROVIDER_ID, "invalid-response");
          return { searchedOn, results: parsed.data.results };
        }),
      );
      const batches = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
      if (batches.length === 0 && settled.length > 0) {
        const first = settled[0];
        throw first?.status === "rejected" && first.reason instanceof ProviderError
          ? first.reason
          : new ProviderError(PROVIDER_ID, "invalid-response");
      }
      return toFindings(batches, query);
    },
  };
}
