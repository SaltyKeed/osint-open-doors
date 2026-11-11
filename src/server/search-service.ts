import "server-only";
import type { Exposure, QueryKind, SearchQuery } from "@/server/domain/types";
import { type BreachProvider, ProviderError } from "@/server/providers/types";

export type SearchResult = {
  exposures: Exposure[];
  failedProviders: string[];
};

function queryKinds(query: SearchQuery): QueryKind[] {
  return query.email ? ["email"] : [];
}

// Runs all providers in parallel. A failing or slow provider does not block the others
// (Promise.allSettled + timeout): the visitor gets a partial result instead of an error.
export async function runSearch(
  query: SearchQuery,
  providers: readonly BreachProvider[],
  timeoutMs = 8000,
): Promise<SearchResult> {
  const kinds = queryKinds(query);
  const relevant = providers.filter((p) => p.supports.some((k) => kinds.includes(k)));

  const settled = await Promise.allSettled(
    relevant.map((p) => p.search(query, AbortSignal.timeout(timeoutMs))),
  );

  const exposures: Exposure[] = [];
  const failedProviders: string[] = [];
  settled.forEach((outcome, index) => {
    const provider = relevant[index];
    if (!provider) return;
    if (outcome.status === "fulfilled") {
      exposures.push(...outcome.value);
    } else {
      failedProviders.push(provider.id);
      // Technical identifiers only (CLAUDE.md invariant): provider id and status.
      const status = outcome.reason instanceof ProviderError ? outcome.reason.status : "unknown";
      console.error(`[search] provider=${provider.id} status=${status}`);
    }
  });

  return { exposures, failedProviders };
}
