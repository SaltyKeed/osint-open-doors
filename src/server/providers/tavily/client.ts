import "server-only";
import { providerFetch } from "../http";
import { PROVIDER_ID } from "./mapper";

const URL_SEARCH = "https://api.tavily.com/search";

// One web search (1 Tavily credit). Returns the raw JSON.
export async function tavilySearch(
  apiKey: string,
  searchQuery: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await providerFetch(PROVIDER_ID, URL_SEARCH, signal, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: searchQuery, max_results: 10, search_depth: "basic" }),
  });
  return response.json();
}
