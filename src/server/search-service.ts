import "server-only";
import type { Finding, QueryKind, SearchQuery } from "@/server/domain/types";
import { type BreachProvider, ProviderError } from "@/server/providers/types";

// Optional second step on the results (e.g. web archive), with its own time limit.
export type Enricher = (findings: Finding[], signal: AbortSignal) => Promise<Finding[]>;

export type SearchResult = {
  findings: Finding[];
  failedProviders: string[];
};

function queryKinds(query: SearchQuery): QueryKind[] {
  const kinds: QueryKind[] = [];
  if (query.email) kinds.push("email");
  if (query.phone) kinds.push("phone");
  if (query.firstName && query.lastName) kinds.push("name");
  if (query.username) kinds.push("username");
  return kinds;
}

// Runs all providers in parallel. A failing or slow provider does not block the others
// (Promise.allSettled + timeout): the visitor gets a partial result instead of an error.
export async function runSearch(
  query: SearchQuery,
  providers: readonly BreachProvider[],
  timeoutMs = 12000,
  enrich?: Enricher,
  enrichTimeoutMs = 8000,
): Promise<SearchResult> {
  const kinds = queryKinds(query);
  const relevant = providers.filter((p) => p.supports.some((k) => kinds.includes(k)));

  const settled = await Promise.allSettled(
    relevant.map((p) => p.search(query, AbortSignal.timeout(timeoutMs))),
  );

  const findings: Finding[] = [];
  const failedProviders: string[] = [];
  settled.forEach((outcome, index) => {
    const provider = relevant[index];
    if (!provider) return;
    if (outcome.status === "fulfilled") {
      findings.push(...outcome.value);
    } else {
      failedProviders.push(provider.id);
      // Technical identifiers only (CLAUDE.md invariant): provider id and status.
      const status = outcome.reason instanceof ProviderError ? outcome.reason.status : "unknown";
      console.error(`[search] provider=${provider.id} status=${status}`);
    }
  });

  if (!enrich) return { findings, failedProviders };
  try {
    return { findings: await enrich(findings, AbortSignal.timeout(enrichTimeoutMs)), failedProviders };
  } catch {
    console.error("[search] enrichment failed");
    return { findings, failedProviders };
  }
}
