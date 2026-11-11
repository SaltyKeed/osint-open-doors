import "server-only";
import { phoneSearchVariants } from "@/server/domain/phone";
import type { QueryKind, SearchQuery } from "@/server/domain/types";
import { type BreachProvider, ProviderError } from "../types";
import { tavilySearch } from "./client";
import { PROVIDER_ID, type TavilyBatch, toFindings } from "./mapper";
import { tavilyResponseSchema } from "./schema";

// Search strings: exact email, every common phone format, full name (1 credit each).
function searches(query: SearchQuery): { searchedOn: QueryKind; text: string }[] {
  const list: { searchedOn: QueryKind; text: string }[] = [];
  if (query.email) list.push({ searchedOn: "email", text: `"${query.email}"` });
  if (query.phone) {
    const variants = phoneSearchVariants(query.phone).map((v) => `"${v}"`);
    list.push({ searchedOn: "phone", text: variants.join(" OR ") });
  }
  if (query.firstName && query.lastName) {
    list.push({ searchedOn: "name", text: `"${query.firstName} ${query.lastName}"` });
  }
  return list;
}

export function createTavilyProvider(apiKey: string | undefined): BreachProvider {
  return {
    id: PROVIDER_ID,
    tier: "surface",
    supports: ["email", "phone", "name"],
    async search(query, signal) {
      if (!apiKey) throw new ProviderError(PROVIDER_ID, "missing-key");
      const batches: TavilyBatch[] = await Promise.all(
        searches(query).map(async ({ searchedOn, text }) => {
          const parsed = tavilyResponseSchema.safeParse(await tavilySearch(apiKey, text, signal));
          if (!parsed.success) throw new ProviderError(PROVIDER_ID, "invalid-response");
          return { searchedOn, results: parsed.data.results };
        }),
      );
      return toFindings(batches, query);
    },
  };
}
