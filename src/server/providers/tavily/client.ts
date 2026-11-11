import "server-only";
import { providerFetch } from "../http";
import { PROVIDER_ID } from "./mapper";

const URL_SEARCH = "https://api.tavily.com/search";

export type TavilyOptions = {
  maxResults: number; // up to 20
  depth: "basic" | "advanced"; // basic = 1 credit, advanced = 2 credits
  includeDomains?: string[]; // restricts the search to these sites
};

// One web search. Returns the raw JSON.
export async function tavilySearch(
  apiKey: string,
  searchQuery: string,
  options: TavilyOptions,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await providerFetch(PROVIDER_ID, URL_SEARCH, signal, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: searchQuery,
      max_results: options.maxResults,
      search_depth: options.depth,
      include_domains: options.includeDomains,
      include_raw_content: "text",
    }),
  });
  return response.json();
}
