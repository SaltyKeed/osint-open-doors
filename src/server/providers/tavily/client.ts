import "server-only";
import { providerFetch } from "../http";
import { PROVIDER_ID } from "./mapper";

const URL_SEARCH = "https://api.tavily.com/search";

// One web search (1 Tavily credit, up to 20 results). Returns the raw JSON.
export async function tavilySearch(
  apiKey: string,
  searchQuery: string,
  signal: AbortSignal,
  maxResults = 10,
): Promise<unknown> {
  const response = await providerFetch(PROVIDER_ID, URL_SEARCH, signal, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: searchQuery, max_results: maxResults, search_depth: "basic" }),
  });
  return response.json();
}
