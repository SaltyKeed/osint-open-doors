import "server-only";
import { found, type Source, type SourceRecord } from "@/server/domain/source";
import { toWebRecords } from "./mapper";
import { planQueries } from "./queries";
import { tavilyResponseSchema } from "./schema";

// Tavily, main search engine (SOURCES.md, section 4). Basic search: 1 credit per
// query, 1000 free credits a month. Skipped while TAVILY_API_KEY is missing.
export const webSearch: Source = {
  id: "tavily",
  label: "Tavily (recherche web)",
  accepts: ["EMAIL", "TEL", "PSEUDO", "NOM"],
  requiredEnv: ["TAVILY_API_KEY"],
  async run(identifier, { signal, env }) {
    const pages = await Promise.all(
      planQueries(identifier).map(async (planned) => {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          signal,
          headers: { Authorization: `Bearer ${env.TAVILY_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: planned.query,
            max_results: planned.maxResults,
            search_depth: "basic",
            include_domains: planned.includeDomains,
            include_raw_content: "text",
          }),
        });
        // 432 and 433: plan or monthly credit limit reached.
        if ([429, 432, 433].includes(response.status)) throw new Error("tavily: HTTP 429");
        if (!response.ok) throw new Error(`tavily: HTTP ${response.status}`);
        const parsed = tavilyResponseSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("tavily: invalid response");
        return toWebRecords(parsed.data, identifier);
      }),
    );
    // The same page found by two queries is kept once.
    const byUrl = new Map<string, SourceRecord>();
    for (const record of pages.flat()) byUrl.set(record.evidence ?? record.origin, record);
    return found([...byUrl.values()]);
  },
};
