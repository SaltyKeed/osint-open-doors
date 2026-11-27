import "server-only";
import { fetchJson } from "@/server/providers/http";

const SEARCH_URL = "https://api.tavily.com/search";

/** One basic search (1 credit), exact phrases only, without generated answer nor page content. */
export function search(
  query: string,
  apiKey: string,
  signal: AbortSignal,
  options: { country?: string; includeDomains?: string[] } = {},
): Promise<unknown | null> {
  return fetchJson("tavily", SEARCH_URL, signal, { Authorization: `Bearer ${apiKey}` }, {
    query,
    search_depth: "basic",
    max_results: 10,
    exact_match: true,
    include_answer: false,
    include_raw_content: false,
    ...(options.country && { country: options.country }),
    ...(options.includeDomains && { include_domains: options.includeDomains }),
  });
}
