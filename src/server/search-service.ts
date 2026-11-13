import "server-only";
import { queryKinds } from "@/server/domain/search-query";
import type { Exposure, SearchQuery } from "@/server/domain/types";
import type { BreachProvider } from "@/server/providers/types";

export interface SearchResult {
  exposures: Exposure[];
  failedProviders: string[];
}

// A failing or slow provider does not block the others: the visitor gets a partial result.
export async function searchAll(
  query: SearchQuery,
  providers: readonly BreachProvider[],
  timeoutMs = 8000,
): Promise<SearchResult> {
  const kinds = queryKinds(query);
  const relevant = providers.filter((p) => p.supports.some((kind) => kinds.includes(kind)));
  const signal = AbortSignal.timeout(timeoutMs);
  const settled = await Promise.allSettled(relevant.map((p) => p.search(query, signal)));

  const result: SearchResult = { exposures: [], failedProviders: [] };
  settled.forEach((outcome, i) => {
    const id = relevant[i]!.id;
    if (outcome.status === "fulfilled") {
      result.exposures.push(...outcome.value);
    } else {
      result.failedProviders.push(id);
      // Provider id only: an error message could contain the visitor's input.
      console.error(`[search] provider failed: ${id}`);
    }
  });
  return result;
}
